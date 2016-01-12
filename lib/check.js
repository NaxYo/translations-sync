#!/usr/bin/env node

var _ = require('underscore');
var Promise = require('promise');
var config = require('../config.json');
var MongoClient = require('mongodb').MongoClient;

var dataBase, originals, translations, report = [];
var collection = config.data_base.collection;

(function() {
  if(module.parent) module.exports = run;
  else run();

  function run() {
    return connect()
      .then(getOriginals)
      .then(checkTranslations)
      .then(showReport)
      .then(close);
  }
})();

function doQuery(query, resolve, reject) {
  dataBase.collection(collection).find(query).toArray(function(err, items) {
    err && reject();
    err || resolve(items);
  });
}

function connect() {
  console.log('Connecting to MongoDB...');
  return new Promise(function(resolve, reject) {
    MongoClient.connect('mongodb://localhost:27017/dialect', function(err, db) {
      dataBase = db;

      err && reject();
      err || resolve();
    });
  });
}

function getOriginals() {
  console.log('Getting originals...');
  return new Promise(function(resolve, reject) {
    doQuery({ locale: 'en' }, function(items) {
      originals = items;
      resolve();
    }, reject);
  });
}

function checkTranslations() {
  console.log('Checking translations...');
  return new Promise(function(resolve, reject) {
    var totalTasks = originals.length;
    originals.length || afterAllProcess();

    _.each(originals, function(org) {
      var query = { locale: { $ne: 'en' }, original: org.original };

      doQuery(query, function(translations) {
        _.each(translations, function(trans) {
          var isSecureHTML = hasSameHTMLTags(org, trans);
          isSecureHTML || report.push({ translation: trans, type: 'tags_error' });

          var isSameHandlebars = hasSameHandlebars(org, trans);
          isSameHandlebars || report.push({ translation: trans, type: 'handlebars_warning' });

          if(!isSecureHTML) {
            totalTasks++;
            markAsUnapproved(trans, afterProcess);
          }
        });

        afterProcess();
      }, reject);
    });

    function afterProcess() {
      totalTasks--;
      totalTasks || resolve();
    }
  });
}

function hasSameHTMLTags(org, trans) {
  if(!trans.translation) return true;

  var regex = /(<([^>]+)>)/ig;
  var originalTags = org.translation && org.translation.match(regex);
  var translationTags = trans.translation && trans.translation.match(regex);

  return isAllEqual(originalTags, translationTags);
}

function hasSameHandlebars(org, trans) {
  if(!trans.translation) return true;

  var regex = /({{([^}]+)}})/ig;
  var originalHandlebars1 = org.translation && org.translation.match(regex);
  var translationHandlebars1 = trans.translation && trans.translation.match(regex);

  regex = /({{{([^}]+)}}})/ig;
  var originalHandlebars2 = org.translation && org.translation.match(regex);
  var translationHandlebars2 = trans.translation && trans.translation.match(regex);

  return isAllEqual(originalHandlebars1, translationHandlebars1)
    && isAllEqual(originalHandlebars2, translationHandlebars2);
}

function isAllEqual(arr1, arr2) {
  if(!arr1 || !arr2)
    return !arr1 && !arr2

  return arr1.length === arr1.length
    && _.all(arr1, function(data, index) {
      return arr2[index] === data;
    });
}

function markAsUnapproved(translation, afterProcess) {
  dataBase.collection(collection).update(
    { locale : translation.locale, original: translation.original },
    { '$set' : { approved: false } },
    afterProcess
  );
}

function showReport() {
  var unapproved = 0;

  _.each(report, function(trouble) {
    var t = trouble.translation;

    switch(trouble.type) {
      case 'tags_error':
        unapproved++;
        console.log('Error: [' + t.locale + '] ' + t.original + ' has some insecure tags');
        break;

      case 'handlebars_warning':
        console.log('Warning: [' + t.locale + '] ' + t.original + ' has some handlebars differences');
        break;
    }
  });

  console.log(unapproved + ' translations have been marked as unnaproved.')
}

function close() {
  dataBase.close();
}
