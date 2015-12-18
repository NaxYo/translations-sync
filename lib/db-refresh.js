var util = require('./util');
var _ = require('underscore');
var config = require('../config');
var MongoClient = require('mongodb').MongoClient;

var dataBase, items;
var collection = config.dialect.store.mongodb.collection;

module.exports = function() {
  markAsUnprocessed()
      .then(refresh)
      .then(clean);
};

function markAsUnprocessed() {
    var promise = new Promise(function(resolve, reject) {
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
              .find({ locale: 'en' })
              .toArray(function(err, results) {
                items = results;

                err && reject();
                err || resolve();
              });
          }
        );
      });
    });

    return promise;
}

function refresh() {
  var unfinishedProcess = 0;
  var promise = new Promise(function(resolve, reject) {
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

      _.each(_.without(config.dialect.locales, 'en'), function(locale) {
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

  return promise;
}

function clean(db) {
    var promise = new Promise(function(resolve, reject) {
        dataBase.collection(collection).remove({ checked: false }, function(err) {
          dataBase.close();

          err && reject();
          err || resolve();
        });
    });

    return promise;
}
