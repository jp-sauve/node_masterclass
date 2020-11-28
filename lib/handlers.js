/**
 * Request Handlers
 */
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
      if (err) {
        console.log("pass to hash: ", password);
        let hashedPassword = helpers.hash(password);
        console.log("post hash pass: ", hashedPassword);
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
              console.log(err);
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
  const phoneExists =
    data.queryStringObject.has("phone") &&
    typeof data.queryStringObject.get("phone") == "string";

  if (phoneExists) {
    _data.read(
      "users",
      data.queryStringObject.get("phone"),
      function (err, data) {
        if (!err) {
          delete data.hashedPassword;
          callback(200, data);
        } else {
          callback(404, { Message: "User not found" });
        }
      }
    );
  } else {
    callback(400, { Error: "Missing field" });
  }
};

// Required: phone
// Optional: one of the other fields
// TODO: Restrict retrieval to users' own data
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
              callback(500, { Error: "Unable to update user data: " + err });
            }
          });
        } else {
          callback(404, { Error: "No user found" });
        }
      });
    }
  } else {
    callback(400, { Error: "Cannot search without phone number" });
  }
};

// TODO: only allow deleting own Object
// TODO: delete other user data at the same time
handlers._users.delete = function (data, callback) {
    const phoneExists =
      data.queryStringObject.has("phone") &&
      typeof data.queryStringObject.get("phone") == "string";
    const phone = data.queryStringObject.get("phone");
    if (phoneExists) {
      _data.read(
        "users",
        data.queryStringObject.get("phone"),
        function (err, data) {
          if (!err) {
            console.log(phone, " deleted here.")
            _data.delete("users", phone, function (err) {
              if (!err) {
                callback(200);
              } else {
                callback(500, {"Error": "Failed to delete user file"})
              }
            });
          } else {
            callback(404, { Message: "User data not found" });
          }
        }
      );
    } else {
      callback(400, { Error: "Missing field" });
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
