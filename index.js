/**
 * Primary file
 */

//Deps
const fs = require('fs');
const http = require('http');
const https = require('https');
var StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// http Server
const httpServer = http.createServer((req, res) => {
  unifiedSvr(req, res);
});
httpServer.listen(config.httpPort, function () {
  console.log(`Server in ${config.envName} mode: listening on port ${config.httpPort} \n`)
})

// https Server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
}
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedSvr(req, res);
});
httpsServer.listen(config.httpsPort, function () {
  console.log(`Server in ${config.envName} mode: listening on port ${config.httpsPort} \n`)
})

/**
 * @description Generic response for http & https
 */

const unifiedSvr = function (req, res) {
  const parsedUrl = new URL(req.url, "http://localhost:3000/");
  const path = parsedUrl.pathname;
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  // get the query string
  const queryStringObj = parsedUrl.searchParams;
  const method = req.method.toLowerCase();
  const headers = req.headers;
  
  // Get any available payload
  const decoder = new StringDecoder('utf-8');
  let buff = "";
  
  req.on('data', (data) => {
    buff = buff.concat(decoder.write(data))
  })
  
  req.on('end', () => {
    buff = buff.concat(decoder.end());
  
    // Choose handler for request, else 'notFound'
    const chosenHandler = typeof (router[trimmed]) != 'undefined' ? router[trimmed] : handlers.notFound;
  
    const data = {
      'trimmedPath': trimmed,
      'queryStringObject': queryStringObj,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buff)
    }
  
    chosenHandler(data, (status, payload) => {
      // default to 200 or use submitted
      status = typeof (status) == 'number' ? status : 200;
  
      // return payload or {}
      payload = typeof (payload) == 'object' ? payload : {};
      let payloadStr = JSON.stringify(payload);
  
      // Set content type
      res.setHeader('Content-Type','application/json')
      res.writeHead(status);
      res.end(payloadStr);
      console.log("Full Response: ", status, payloadStr);
  
    })
  
  })
  
}

// Router & Route Handlers

const router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens
}