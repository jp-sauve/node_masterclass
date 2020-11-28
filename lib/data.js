/**
 * Data storage library
 */

// Dependencies
const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

const lib = {};

lib.baseDir = path.join(__dirname, "/../.data/");

lib.create = function(dir, filename, data, callback) {
  // open file for writing
  fs.open(
    lib.baseDir + dir + "/" + filename + ".json",
    "wx",
    function (err, fd) {
      if (!err && fd) {
        const strData = JSON.stringify(data);
        fs.writeFile(fd, strData, function (err) {
          if (!err) {
            fs.close(fd, function (err) {
              if (!err) {
                // returning false for no error
                callback(false);
              } else {
                callback("Error closing new file");
              }
            });
          } else {
            callback("Error writing to file");
          }
        });
      } else {
        callback("Couldn't create new file, maybe it exists?");
      }
    }
  );
};

lib.read = function(dir, file, callback) {
  fs.readFile(lib.baseDir + dir + "/" + file + ".json", "utf8", function (err, data) {
    if (!err && data) {
      callback(err,helpers.parseJsonToObject(data))
    } else {
      callback(err,data)
    }
  })
}

lib.update = function (dir, file, data, callback) {
  fs.open(lib.baseDir + dir + "/" + file + ".json", "r+", function (err, fd) {
    if (!err && fd) {
      const strData = JSON.stringify(data);
      fs.ftruncate(fd, function (err) {
        if (err) console.error("Truncation failure. ", err)
      })
      fs.writeFile(fd, strData, function (err) {
        if (!err) {
          fs.close(fd, function(err) {
            if (!err) {
              callback(false);
            } else {
              callback(err);
            }
          })
        } else {
          callback(err);
        }
      })
    } else {
      callback(err + ": " + lib.baseDir + dir + "/" + file + ".json");
    }
  });
}

lib.delete = function (dir, file, callback) {
  fs.unlink(lib.baseDir + dir + "/" + file + ".json", function (err) {
    if (!err) {
      console.log("file deleted")
      callback(false);
    } else {
      callback(err);
    }
  });
}

module.exports = lib;
