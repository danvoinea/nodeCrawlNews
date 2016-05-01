var log = require('log-colors');
var config = require('./config');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var publicatii = [{
  url: 'http://www.gds.ro/',
  timestamp: '',
  nume: 'GAZETA de SUD',
  ultimaUpdatare: '',
  categorie: 'Regional',
  frecventa: 10,
  ordine: 0,
  regiune: '',
  parinte: ''
}, {
  url: 'http://www.gandul.info/',
  timestamp: '',
  nume: 'Evenimentul Zilei',
  ultimaUpdatare: '',
  categorie: 'National',
  frecventa: 10,
  ordine: 0,
  regiune: '',
  parinte: ''
}];

MongoClient.connect(config.mongo, function(err, db) {
  db.open(function(err, db) {

    // Crete the collection for the distinct example
    db.createCollection('publicatii', function(err,
      collection) {

      collection.count(function(err, count) {
        if (count === 0) {
          console.log('inserting startup data');
          collection.insert(publicatii, function(err, ids) {});
        }
        db.close();
      });

    });
  });

});
