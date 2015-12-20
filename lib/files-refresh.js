#!/usr/bin/env node

var util = require('./util');
var _ = require('underscore');
var config = require('../config.json');
var MongoClient = require('mongodb').MongoClient;

var dataBase, collection = config.data_base.collection;

(function() {
  if(module.parent) module.exports = run;
  else run();

  function run() {
    return new Promise(function(resolve, reject) {
      MongoClient.connect('mongodb://localhost:27017/dialect', function(err, db) {
        dataBase = db;

        err && reject();
        err || db.collection(collection).find().toArray(function(err, items) {
          err && reject();
          err || processResults(items, resolve, reject);
        });
      });
    });
  }
})();

function processResults(items, resolve, reject) {
  var namespaces = _.groupBy(items, namespaceSanetize);
  var unfinishedProcess = _.size(namespaces);

  _.each(namespaces, function(items, namespace) {
    util.setNamespaceTranslation(namespace, items).then(afterProcess);
  });

  function afterProcess() {
    if(--unfinishedProcess < 1) {
      dataBase.close();
      resolve();
    }
  }
}

function namespaceSanetize(item) {
  var keys = item.original.split('.');
  var namespace = keys.shift();

  item.original = keys.join('.');
  return namespace;
}
