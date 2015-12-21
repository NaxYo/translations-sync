var fs = require('fs');
var _ = require('underscore');
var Promise = require('promise');
var beautify = require('js-beautify').js_beautify;
var repository = require('../config.json').repository;
var namespaces = require('../config.json').namespaces;
var locales = require('../config.json').data_base.locales;

module.exports = {
  forEachNamespaceFile    : forEachNamespaceFile,
  setNamespaceTranslation : setNamespaceTranslation
}

function forEachNamespaceFile(callback, l) {
  _.each(l ? [ l ] : locales, function(locale) {
    _.each(namespaces, function(namespaceFile, namespace) {
      callback(getFile(namespaceFile, locale), namespace, locale);
    });
  });
}

function setNamespaceTranslation(namespace, items) {
  var beautifyOptions = { indent_size: 4 };
  var namespaceFile = namespaces[namespace];
  var translations = getInitialTranslationsObject();

  _.each(items, addTranslationKey);

  return new Promise(function(resolve, reject) {
    var unfinishedProcess = locales.length;

    _.each(locales, function(locale) {
      var fileName = repository + namespaceFile + '.' + locale + '.json';
      var text = beautify(JSON.stringify(translations[locale]), beautifyOptions);

      fs.writeFile(fileName, text, function(err) {
        err && reject();
        err || afterProcess();
      });
    });

    function afterProcess() {
      --unfinishedProcess < 1 && resolve();
    }
  });

  function getInitialTranslationsObject() {
    var translations = {};

    _.each(locales, function(locale) {
      translations[locale] = {};
    });

    return translations;
  }

  function addTranslationKey(item) {
    var currentObject = translations[item.locale];
    var keys = item.original.split('.');
    var key = keys.shift();

    while(keys.length > 0) {
      currentObject[key] = currentObject[key] || {};
      currentObject = currentObject[key];
      key = keys.shift();
    }

    currentObject[key] = getAprovedTranslation(item);
  }

  function getAprovedTranslation(item) {
    //var isRightTranslation = item.locale === 'en' || item.approved;
    var isRightTranslation = true;

    return isRightTranslation
      ? item.translation
      : _.find(items, {
        locale   : 'en',
        original : item.original
      }).translation;
  }
}

function getFile(namespaceFile, locale) {
  var data, fileName = repository + namespaceFile + '.' + locale + '.json';

  try { data = require(fileName) }
  catch(err) { data = {}; }

  return data;
}
