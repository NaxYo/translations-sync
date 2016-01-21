#!/usr/bin/env node

var util = require('./util');
var _ = require('underscore');
var config = require('../config.json');
var locales = config.data_base.locales;
var MongoClient = require('mongodb').MongoClient;

var collection = config.data_base.collection;

MongoClient.connect('mongodb://localhost:27017/dialect', function(err, db) {
  err && reject();
  err || db.collection(collection).remove({}, populate);

  function populate() {
    var unfinishedProcess = 0;
    util.forEachNamespaceFile(processKey);

    function processKey(data, path, locale) {
      if(typeof data === 'object') {
        _.each(data, function(innerData, key) {
          processKey(innerData, path + '.' + key, locale);
        });
        return;
      }

      setKey(locale, path, data);
    }

    function setKey(locale, key, translation) {
      unfinishedProcess++;

      db.collection(collection).insert({
        locale      : locale,
        original    : key,
        translation : translation,
        approved    : false
      }, afterProcess);
    }

    function afterProcess() {
      --unfinishedProcess < 1 && db.close();
    }
  }
});
