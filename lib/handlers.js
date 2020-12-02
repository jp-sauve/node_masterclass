/**
 * Request Handlers
 */
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
        _data.read("users", phone, function (err, data) {
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
        });
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
              callback(500, { Message: "Could not create token" });
            }
          });
        } else {
          callback(400, { Message: "Login Error!" });
        }
      } else {
        callback(400, { Message: "Login Error" });
      }
    });
  } else {
    callback(400, { Message: "Missing fields" });
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
    handlers._checks[data.method](data, callback);
  } else {
    callback(405, { Error: data.method + " is not a good method." });
  }
};

handlers._checks = {};

handlers._checks.post = function (data, callback) {
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
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

  if ((protocol, url, method, successCodes, timeoutSeconds)) {
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    if (token) {
      _data.read("tokens", token, function (err, tokenData) {
        // This line is wrong in lesson. we should check for expiry, not just existence
        if (!err && tokenData.expires > Date.now()) {
          _data.read("users", tokenData.phone, function (err, userData) {
            if (!err) {
              const userChecks =
                typeof userData.checks == "object" &&
                userData.checks instanceof Array
                  ? userData.checks
                  : [];
              // ensure max checks limit
              if (userChecks.length < config.maxChecks) {
                // Create new id for check
                const checkObj = {
                  id: helpers.createRandomString(20),
                  userPhone: tokenData.phone,
                  protocol,
                  url,
                  method,
                  successCodes,
                  timeoutSeconds,
                };
                // Create check and add its id to user data
                _data.create("checks", checkObj.id, checkObj, function (err) {
                  if (!err) {
                    userData.checks = userChecks;
                    userData.checks.push(checkObj.id);
                    _data.update(
                      "users",
                      tokenData.phone,
                      userData,
                      function (err) {
                        if (!err) {
                          callback(200, checkObj);
                        } else {
                          callback(500, {
                            Message: "Unable to write check to user file",
                          });
                        }
                      }
                    );
                  } else {
                    callback(500, { Message: "Error writing new check" });
                  }
                });
              } else {
                callback(400, { Message: "User has max checks already: " });
              }
            } else {
              callback(500, { Message: "User not found" });
            }
          });
        } else {
          callback(403, { Message: "Authentication invalid" });
        }
      });
    } else {
      callback(403, { Message: "Adding a check requires a login token" });
    }
  } else {
    callback(400, { Message: "Payload invalid or missing data" });
  }
};
handlers._checks.get = function (data, callback) {
  const id =
    data.queryStringObject.has("id") &&
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length == 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    // get token from header
    _data.read("checks", id, function (err, checkData) {
      if (!err) {
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (isValid) {
            console.log("Token valid: ", isValid);
            if (isValid) {
              _data.read(
                "users",
                checkData.userPhone,
                function (err, userData) {
                  if (!err) {
                    if (userData.checks.indexOf(checkData.id) > -1) {
                      callback(200, checkData);
                    } else {
                      callback(403, {
                        Message: "Check not found for this user",
                      });
                    }
                  } else {
                    callback(404, { Message: "User not found" });
                  }
                }
              );
            } else {
              callback(403, { Message: "Not authenticated" });
            }
          }
        );
      } else {
        callback(403, { Message: "Check not found for this user" });
      }
    });
  } else {
    callback(400, { Message: "Missing field" });
  }
};

handlers._checks.put = function (data, callback) {
  // Required: checkId, new check Data (url,method,successCodes,timeoutSeconds)
  const checkId =
    data.queryStringObject.has("id") &&
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").length == 20
      ? data.queryStringObject.get("id")
      : false;
  // if checkId seems valid, collect rest of data
  if (checkId) {
    const newProtocol =
      typeof data.payload.protocol == "string" &&
      ["https", "http"].indexOf(data.payload.protocol.trim()) > -1
        ? data.payload.protocol.trim()
        : false;
    const newUrl =
      typeof data.payload.url == "string" && data.payload.url.trim().length > 0
        ? data.payload.url.trim()
        : false;
    const newMethod =
      typeof data.payload.method == "string" &&
      ["post", "get", "put", "delete"].indexOf(data.payload.method.trim()) > -1
        ? data.payload.method.trim()
        : false;
    const newSuccessCodes =
      typeof data.payload.successCodes == "object" &&
      data.payload.successCodes instanceof Array &&
      data.payload.successCodes.length > 0
        ? data.payload.successCodes
        : false;
    const newTimeoutSeconds =
      typeof data.payload.timeoutSeconds == "number" &&
      data.payload.timeoutSeconds % 1 === 0 &&
      data.payload.timeoutSeconds >= 1 &&
      data.payload.timeoutSeconds <= 5
        ? data.payload.timeoutSeconds
        : false;
    // if there is something to update, look up the check to get user
    if (
      newProtocol ||
      newUrl ||
      newMethod ||
      newSuccessCodes ||
      newTimeoutSeconds
    ) {
      _data.read("checks", checkId, function (err, checkData) {
        if (!err) {
          const token =
            typeof data.headers.token == "string" ? data.headers.token : false;
          const phone = checkData.userPhone;
          handlers._tokens.verifyToken(token, phone, function (isValid) {
            if (isValid) {
              _data.read("users", phone, function (err, userData) {
                if (!err) {
                  // does check belong to current user?
                  if (userData.checks.indexOf(checkData.id) > -1) {
                    newCheckData = {
                      id: checkData.id,
                      userPhone: checkData.userPhone,
                      protocol: newProtocol || checkData.protocol,
                      url: newUrl || checkData.url,
                      method: newMethod || checkData.method,
                      successCodes: newSuccessCodes || checkData.successCodes,
                      timeoutSeconds:
                        newTimeoutSeconds || checkData.timeoutSeconds,
                    };
                    _data.update(
                      "checks",
                      checkData.id,
                      newCheckData,
                      function (err) {
                        if (!err) {
                          callback(200, newCheckData);
                        } else {
                          callback(500, { Message: "Unable to update check" });
                        }
                      }
                    );
                  } else {
                    callback(403, { Message: "Invalid authentication" });
                  }
                } else {
                  callback(500, { Message: "User not found for check Id" });
                }
              });
            } else {
              callback(403, { Message: "Invalid authentication" });
            }
          });
        } else {
          callback(404, { Message: "Check not found for this user" });
        }
      });
    } else {
      callback(400, { Message: "Nothing to do" });
    }
  } else {
    callback(400, { Message: "Missing data" });
  }
};
handlers._checks.delete = function (data, callback) {
  //Required: Id
  const id =
    data.queryStringObject.has("id") &&
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length == 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    _data.read("checks", id, function (err, checkData) {
      if (!err) {
        const checkPhone = checkData.userPhone;
        _data.read("users", checkPhone, function (err, userData) {
          if (!err) {
            const token =
              typeof data.headers.token == "string"
                ? data.headers.token
                : false;
            handlers._tokens.verifyToken(
              token,
              userData.phone,
              function (isValid) {
                if (isValid) {
                  if (
                    typeof userData.checks == "object" &&
                    userData.checks instanceof Array &&
                    userData.checks.indexOf(id) > -1
                  ) {
                    _data.delete("checks", id, function (err) {
                      if (!err) {
                        const purged = userData.checks.splice(1,
                          userData.checks.indexOf(id)
                        );
                        console.log("Purged: ", purged);
                        console.log("Remaining: ", userData.checks)
                        _data.update(
                          "users",
                          userData.phone,
                          userData,
                          function (err) {
                            if (!err) {
                              callback(200);
                            } else {
                              callback(500, {
                                Message: "Unable to save pruned checks list",
                              });
                            }
                          }
                        );
                      } else {
                        callback(500, { Message: "Cannot delete check" });
                      }
                    });
                  } else {
                    callback(500, { Message: "User has no such check" });
                  }
                } else {
                  callback(401, { "Message": "Unauthorized" })
                }
              });
                
          } else {
            callback(500, { Message: "Check has no matching user" });
          }
        });
      } else {
        callback(401, { Message: "Check id not found" });
      }
    });
      
    } else {
      callback(404, { Message: "Check id not found" });
    }
};

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
