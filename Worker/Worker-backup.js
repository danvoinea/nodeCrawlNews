#!/usr/bin/env node

var log = require('log-colors');
var beanstalk = require('fivebeans');
var Promise = require('bluebird');
var os = require('os');
var util = require('util');
var config = require('./config');
var request = require("request");
var cheerio = require("cheerio");
var url = require('url');

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var db;

// Number of Cores on this machine
var numCPUs = os.cpus().length;

// These are the number of PhantomJS instances we will spin up on this worker
var numInstances = Math.min(numCPUs * config.ProcMult, config.MaxProc);
log.debug('Using worker instances:' + numInstances);

// We are going to fire up some beanstalkd clients - one for each phantomjs instance
var clientPromises = [];

// Let's connect all our worker instances asynchronously to the master beanstalkd instance
for (var i = 0; i < numInstances; i++) {
	clientPromises.push(new Promise(function(res, rej) {
		var client = new beanstalk.client(config.MasterIP, config.MasterPort);
		client
			.on('connect', function() {
				client.watch('WorkLocal', function(err, numWatched) {

					if (err) return log.error(err);
					//log.debug('WorkTube watched');

					res(client);
				});
			})
			.on('error', function(err) {
				rej(err)
			}).connect();
	}));
}

var numWorking = 0;



// Specify what work we want to do in this kernel
function kernel(jobID, payload, client, clientIdx) {
	var payloadOptions = {
		uri: payload.toString('ascii')
	};

	return new Promise(function(res, rej) {

		var startTime = Date.now();
		numWorking++;

		db.collection("publicatii").find({
			'url': payloadOptions.uri
		}, function(err, docs) {
			docs.each(function(err, doc) {
				if (doc) {


					console.log(doc);



				}
			});
		});

		request(payloadOptions, function(error, response, body) {
			$ = cheerio.load(body);
			$('a').each(function(i, link) {
				var linkText = $(link).text();
				if ($(link).attr('href')) {
					var absoluteURL = url.resolve(payloadOptions.uri, $(link).attr(
						'href'));
					// log.debug(linkText, absoluteURL);
				}
			});
		});

		setTimeout(function() {
			client.destroy(jobID, function(err) {
				if (err) {
					log.error('Error destroying Job: ' + jobID + '; Error: ' + err);
					res();
				}

				var endTime = Date.now();

				log.debug('Worker#: ' + clientIdx + ' |  Done with JobID: ' + jobID +
					' | Took: ' + (endTime - startTime).toString() + 'ms');

				numWorking--;

				if (numWorking <= 0) {
					numWorking = 0;
					log.info('All workers idle');
				}

				res();
			});
		}, Math.random() * 2000);
	});
}



// start database connection
MongoClient.connect(config.mongo, function(err, database) {
	if (err) log.error('Error connecting to database.')
	log.debug("Connected correctly to database.");
	db = database;

	// Now start listening for jobs and kick off the kernel when we get jobs
	Promise.all(clientPromises).then(function(clients) {
		log.debug('Connected to Beanstalkd on localhost');
		clients.forEach(function(client, clientIdx) {

			function reserveAndDispatchJob(client, clientIdx) {
				client.reserve(function(err, jobID, payload) {
					if (err) return log.error(err);

					log.debug('Worker#: ' + clientIdx + ' | Working on JobID: ' +
						jobID);
					kernel(jobID, payload, client, clientIdx).then(function() {
						setImmediate(function() {
							reserveAndDispatchJob(client, clientIdx);
						});
					});
				});
			}
			reserveAndDispatchJob(client, clientIdx);
		});
	});

});
