/**
 * Helper functions
 */

const { strict } = require("assert");
const { type } = require("os");
const crypto = require('crypto');
const config = require('../config');
const helpers = {};

// Create a SHA256 hash from string password
helpers.hash = function (data) {
  if (typeof (data) == 'string' && data.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(data).digest('hex');
  } else {
    return false;
  }
}
helpers.parseJsonToObject = function (data) {
  if (typeof(data) == 'string' && data.length > 0) {
    try {
      return JSON.parse(data)
    } catch (e) {
      return {}
    }
  }
}

helpers.createRandomString = function (strLen) {
  let possibleChars;
  if (typeof (strLen) == 'number' && strLen > 0 ? strLen: false) {
    possibleChars = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
  let newString = "";
  for (let i = 0; i < strLen; i++) {
    newString = newString.concat(possibleChars.charAt(Math.floor(Math.random() * possibleChars.length)))
  }
  return newString;
}
module.exports = helpers;