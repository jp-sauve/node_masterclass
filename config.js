/**
 * Create and export config variables
 */

const environments = {};

// default
environments.staging = {
  "envName": "staging",
  "httpPort": 3000,
  "httpsPort": 3001,
  "hashingSecret": ""
};

environments.production = {
  envName: "production",
  httpPort: 4000,
  httpsPort: 4001,
  hashingSecret: "",
};

const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : "";

const exportedEnv = typeof (environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging;

module.exports = exportedEnv;