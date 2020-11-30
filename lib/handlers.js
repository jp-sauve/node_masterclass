/**
 * Request Handlers
 */
const { time } = require("console");
const config = require("../config");
const _data = require("./data");
const helpers = require("./helpers");

const handlers = {};

handlers.users = function (data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) !== -1) {
    console.log("Trying to ", data.method, " to ", data.trimmedPath);
    handlers._users[data.method](data, callback);
  } else {
    callback(405, { Error: data.method + " is not a good method." });
  }
};

handlers._users = {};
// Required: fn, ln, phone, pw, tos
handlers._users.post = function (data, callback) {
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  const tos =
    typeof data.payload.tos == "boolean" && data.payload.tos == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tos) {
    // ensure user doesn't exist
    _data.read("users", phone, function (err, data) {
      // An error means existing user not found, so create can resume
      if (err) {
        let hashedPassword = helpers.hash(password);
        if (hashedPassword) {
          let userObj = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tos: tos,
          };
          _data.create("users", phone, userObj, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: "Could not create new user" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash password. Nothing saved." });
        }
      } else {
        callback(400, { Error: "User with that phone exists" });
      }
    });
  } else {
    callback(400, { Error: "Missing fields" });
  }
};

handlers._users.get = function (data, callback) {
  const phone =
    data.queryStringObject.has("phone") &&
    typeof data.queryStringObject.get("phone") == "string" &&
    data.queryStringObject.get("phone").trim().length == 10
      ? data.queryStringObject.get("phone").trim()
      : false;
  if (phone) {
    // get token from header
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function (isValid) {
      if (isValid) {
        _data.read("users", phone, function (err, data) {
          if (!err) {
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404, { Message: "User not found" });
          }
        });
      } else {
        callback(403, { Message: "Not authenticated" });
      }
    });
  } else {
    callback(400, { Error: "Missing field" });
  }
};

// Required: phone
// Optional: one of the other fields

handlers._users.put = function (data, callback) {
  const phoneExists =
    data.queryStringObject.has("phone") &&
    typeof data.queryStringObject.get("phone") == "string";
  if (phoneExists) {
    const phone = data.queryStringObject.get("phone");
    const newData = data.payload;
    const newPassword =
      typeof newData.password == "string" && newData.password.trim().length > 0
        ? newData.password.trim()
        : false;
    const newFirstName =
      typeof newData.firstName == "string" &&
      newData.firstName.trim().length > 0
        ? newData.firstName.trim()
        : false;
    const newLastName =
      typeof newData.lastName == "string" && newData.lastName.trim().length > 0
        ? newData.lastName.trim()
        : false;

    if (newPassword || newFirstName || newLastName) {
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;
      handlers._tokens.verifyToken(token, phone, function (isValid) {
        if (isValid) {
          _data.read("users", phone, function (err, userData) {
            if (!err) {
              const newUserObject = Object.assign(
                {},
                userData,
                newFirstName ? { firstName: newFirstName } : {},
                newLastName ? { lastName: newLastName } : {},
                newPassword ? { hashedPassword: helpers.hash(newPassword) } : {}
              );
              _data.update("users", phone, newUserObject, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, {
                    Error: "Unable to update user data: " + err,
                  });
                }
              });
            } else {
              callback(404, { Error: "No user found" });
            }
          });
        } else {
          callback(403, { Message: "Not authenticated" });
        }
      });
    } else {
      callback(400, { Message: "Nothing to change" });
    }
  } else {
    callback(400, { Error: "Cannot search without phone number" });
  }
};

// TODO: delete other user data at the same time
handlers._users.delete = function (data, callback) {
  const phoneExists =
    data.queryStringObject.has("phone") &&
    typeof data.queryStringObject.get("phone") == "string";
  const phone = data.queryStringObject.get("phone");
  if (phoneExists) {
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function (isValid) {
      if (isValid) {
        _data.read(
          "users",
          phone,
          function (err, data) {
            if (!err) {
              _data.delete("users", phone, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Failed to delete user file" });
                }
              });
            } else {
              callback(404, { Message: "User data not found" });
            }
          }
        );
      } else {
        callback(403, { Message: "Not authenticated" });
      }
    });
  } else {
    callback(400, { Error: "Missing field" });
  }
};

/**
 *
 * Token Handlers
 */
handlers.tokens = function (data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) !== -1) {
    console.log("Trying to ", data.method, " to ", data.trimmedPath);
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405, { Error: data.method + " is not a good method." });
  }
};

handlers._tokens = {};
// Create token with phone number and password
handlers._tokens.post = function (data, callback) {
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  if (phone && password) {
    _data.read("users", phone, function (err, data) {
      if (!err) {
        // Checking password
        const givenPass = helpers.hash(password);
        if (givenPass == data.hashedPassword) {
          // Create 1 hour token of random chars
          const tokenObject = {
            phone: phone,
            id: helpers.createRandomString(20),
            expires: Date.now() + 1000 * 60 * 60,
          };
          _data.create("tokens", tokenObject.id, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { "Message": "Could not create token" });
            }
          });
        } else {
          callback(400, { "Message": "Login Error!" });
        }
      } else {
        callback(400, { "Message": "Login Error" });
      }
    });
  } else {
    callback(400, { "Message": "Missing fields" });
  }
};

// Get a token by Id
handlers._tokens.get = function (data, callback) {
  const id =
    data.queryStringObject.has("id") &&
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length == 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    _data.read("tokens", id, function (err, data) {
      if (!err) {
        callback(200, data);
      } else {
        callback(404, { Message: "Id not found" });
      }
    });
  } else {
    callback(400, { Message: "Missing field" });
  }
};
// Extend a token
handlers._tokens.put = function (data, callback) {
  const id =
    data.queryStringObject.has("id") &&
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length == 20
      ? data.queryStringObject.get("id").trim()
      : false;
  const shouldExtend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;
  if (id && shouldExtend) {
    _data.read("tokens", id, function (err, data) {
      if (!err) {
        // Expired already?
        if (data.expires > Date.now()) {
          data.expires = Date.now() + 1000 * 60 * 60;
          _data.update("tokens", id, data, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Message: "Could not extend token" });
            }
          });
        } else {
          callback(400, { Message: "Token already expired" });
        }
      } else {
        callback(404, { Message: "No token to extend" });
      }
    });
  } else {
    callback(400, { Message: "Nothing to do" });
  }
};
// Delete a current token
handlers._tokens.delete = function (data, callback) {
  const id =
    data.queryStringObject.has("id") &&
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length == 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    _data.read("tokens", id, function (err, data) {
      if (!err) {
        _data.delete("tokens", id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Message: "Cannot delete token" });
          }
        });
      } else {
        callback(400, { Message: "Token id not found" });
      }
    });
  } else {
    callback(400, { Message: "Nothing to do" });
  }
};

handlers._tokens.verifyToken = function (id, phone, callback) {
  _data.read("tokens", id, function (err, tokenData) {
    if (!err) {
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

/**
 * 
 * Checks 
 */
handlers.checks = function (data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) !== -1) {
    console.log("Trying to ", data.method, " to ", data.trimmedPath);
    handlers._checks[data.method](data, callback);
  } else {
    callback(405, { Error: data.method + " is not a good method." });
  }
};

handlers._checks = {};

handlers._checks.post = function (data, callback) {
  const protocol =
      typeof data.payload.protocol == "string" &&
      ['https','http'].indexOf(data.payload.protocol) > -1
        ? data.payload.protocol
        : false;
    const url =
      typeof data.payload.url == "string" &&
      data.payload.url.trim().length > 0
        ? data.payload.url.trim()
        : false;
    const method =
      typeof data.payload.method == "string" &&
      ['post','get','put','delete'].indexOf(data.payload.method) > -1
        ? data.payload.method
        : false;
    const successCodes =
      typeof data.payload.successCodes == "object" &&
        data.payload.successCodes instanceof Array &&
        data.payload.successCodes.length > 0
        ? data.payload.successCodes
        : false;
      const timeoutSeconds =
        typeof data.payload.timeoutSeconds == "number" &&
          data.payload.timeoutSeconds % 1 === 0 &&
          data.payload.timeoutSeconds >= 1 &&
          data.payload.timeoutSeconds <= 5
          ? data.payload.timeoutSeconds
          : false;
  
  if (protocol, url, method, successCodes, timeoutSeconds) {
    const token = typeof data.headers.token == "string" ? data.headers.token : false;
    if (token) {
      _data.read("tokens", token, function (err, tokenData) {
        // This line is wrong in lesson. we should check for expiry, not just existence
        if (!err && tokenData.expires > Date.now()) {
          _data.read("users", tokenData.phone, function (err, userData) {
            if (!err) {
              const userChecks = typeof (userData.checks) == 'object' &&
                userData.checks instanceof Array ? userData.checks : [];
              // ensure max checks
              if (userChecks.length < config.maxChecks) {
                // Create id for checks
                const checkObj = {
                  "id": helpers.createRandomString(20),
                  "userPhone": tokenData.phone,
                  "url": url,
                  "method": method,
                  "successCodes": successCodes,
                  "timeoutSeconds": timeoutSeconds
                }
                _data.create("checks", checkObj.id, checkObj, function (err) {
                  if (!err) {
                    userData.checks = userChecks;
                    userData.checks.push(checkObj.id);
                    _data.update("users", tokenData.phone, userData, function (err) {
                      if (!err) {
                        callback(200,checkObj);
                      } else {
                        callback(500,{"Message":"Unable to write check to user file"})
                      }
                    })
                  } else {
                    callback(500,{"Message":"Error writing new check"})
                  }
                })
              } else {
                callback(400,{"Message":"User has max checks already: "})
              }
            } else {
              callback(500,{"Message":"User not found"})
            }
          })
        } else {
          callback(403,{"Message":"Authentication invalid"})
        }
      })
    } else {
      callback(403,{"Message": "Adding a check requires a login token"})
    }
  } else {
    callback(400, { "Message": "Payload invalid or missing data" });
  }
}
handlers._checks.get = function (data, callback) { };
handlers._checks.put = function (data, callback) { };
handlers._checks.delete = function (data, callback) {};
/**
 *
 * Ping Handler
 */
handlers.ping = (data, callback) => {
  // Callback a status code and payload
  callback(200);
};

/**
 *
 * 404 Handler
 */
handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;
