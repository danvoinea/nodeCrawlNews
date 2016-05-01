#!/usr/bin/env node

var log = require('log-colors');
var beanstalk = require('fivebeans');
var Promise = require('bluebird');
var os = require('os');
var util = require('util');
var config = require('./config');

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

MongoClient.connect(config.mongo, function(err, db) {

  if (err) log.error('Error connecting to database.')
  log.debug("Connected correctly to database.");

  db.collection("publicatii", function(err, collection) {

    collection.find().toArray(function(err, addresses) {

      new Promise(function(res, rej) {
        var client = new beanstalk.client(config.MasterIP,
          config.MasterPort);
        client
          .on('connect', function() {
            client.use('WorkLocal', function(err, numWatched) {

              if (err) return log.error(err);

              res(client);
            });
          })
          .on('error', function(err) {
            rej(err)
          }).connect();
      }).then(function(client) {

        log.debug('Connected to Beanstalkd on localhost');

        //Put some  jobs in the tubes
        addresses.forEach(function(payload) {

          console.log(payload);

          client.put(
            0, // Priority
            0, // Delay. 0 = start immediately
            120, // Timeout. 2 minutes.
            payload.url, // empty payload
            function(err, jobID) {
              if (err) return log.error(err);
              log.debug('InjectedJobID: ' + jobID);
            });

        });
        setTimeout(process.exit, 1000);

      });

      db.close();
    });
  });

});
