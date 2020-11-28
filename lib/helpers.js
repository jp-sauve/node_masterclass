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
module.exports = helpers;