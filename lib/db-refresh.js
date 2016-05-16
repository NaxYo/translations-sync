#!/usr/bin/env node

var util = require('./util');
var _ = require('underscore');
var Promise = require('promise');
var config = require('../config.json');
var MongoClient = require('mongodb').MongoClient;
var locales = require('../config.json').data_base.locales;

var dataBase, items;
var collection = config.data_base.collection;

(function() {
  if(module.parent) module.exports = run;
  else run();

  function run() {
    var hasSyntaxErrors = util.hasSyntaxErrors();

    return hasSyntaxErrors
      ? onError()
      : markAsUnprocessed()
        .then(refreshNotBaseLanguage)
        .then(refresh)
        .then(clean);
  }
})();

function markAsUnprocessed() {
  return new Promise(function(resolve, reject) {
    MongoClient.connect('mongodb://localhost:27017/dialect', function(err, db) {
      dataBase = db;

      err && reject();
      err || db.collection(collection).update(
        { },
        { '$set': { checked: false } },
        { multi: true },

        function(err) {
          err && reject();
          err || db.collection(collection)
            .find()
            .toArray(function(err, results) {
              items = results;

              err && reject();
              err || resolve();
            });
        }
      );
    });
  });
}

function refreshNotBaseLanguage() {
  var unfinishedProcess = 0;

  return new Promise(function(resolve, reject) {
    _.each(_.without(locales, 'en'), function(locale) {
      util.forEachNamespaceFile(processKey, locale);
    });

    unfinishedProcess < 1 && resolve();

    function processKey(data, path, locale) {
      if(typeof data === 'object') {
        _.each(data, function(innerData, key) {
          processKey(innerData, path + '.' + key, locale);
        });
        return;
      }

      updateKey(locale, path, data);
    }

    function updateKey(locale, key, translation) {
      var item = _.find(items, { locale: locale, original: key });
      var isDifferentTranslation = !item || item.translation !== translation;

      unfinishedProcess++;

      isDifferentTranslation || afterProcess();
      isDifferentTranslation && dataBase.collection(collection).update(
        { locale : locale, original: key },
        { '$set' : { translation: translation, approved: false, checked: false } },
        { upsert : true },
        afterProcess
      );

    }

    function afterProcess() {
      --unfinishedProcess < 1 && resolve();
    }
  });
}

function refresh() {
  var unfinishedProcess = 0;

  return new Promise(function(resolve, reject) {
    util.forEachNamespaceFile(processKey, 'en');

    function processKey(data, path) {
      if(typeof data === 'object') {
        _.each(data, function(innerData, key) {
          processKey(innerData, path + '.' + key);
        });
        return;
      }

      updateKey(path, data);
    }

    function updateKey(key, data) {
      var item = _.find(items, { locale: 'en', original: key });
      var isNewOriginalTranslation = !item || item.translation !== data;
      var options = isNewOriginalTranslation
        ? { checked: true, translation: data, approved: false }
        : { checked: true };

      unfinishedProcess++;
      dataBase.collection(collection).update(
        { locale : 'en', original: key },
        { '$set' : options },
        { upsert : true },
        afterProcess
      );

      if(isNewOriginalTranslation)
        options.translation = null;

      _.each(_.without(config.data_base.locales, 'en'), function(locale) {
        unfinishedProcess++;
        dataBase.collection(collection).update(
          { locale: locale, original: key },
          { '$set': options },
          { upsert: true },
          afterProcess
        );
      });
    }

    function afterProcess() {
      --unfinishedProcess < 1 && resolve();
    }
  });
}

function clean() {
  return new Promise(function(resolve, reject) {
    dataBase.collection(collection).remove({ checked: false }, function(err) {
      dataBase.close();

      err && reject();
      err || resolve();
    });
  });
}

function onError() {
  return new Promise(function(resolve, reject) {
    console.log('Some files translation has syntax errors');
    reject();
  });
}
