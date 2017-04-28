var fs = require('fs');
var _ = require('underscore');
var Promise = require('promise');
var YAML = require('yamljs');
var beautify = require('js-beautify').js_beautify;
var repository = require('./config').repository;
var namespaces = require('./config').namespaces;
var locales = require('./config').data_base.locales;

module.exports = {
  forEachNamespaceFile    : forEachNamespaceFile,
  setNamespaceTranslation : setNamespaceTranslation,
  hasSyntaxErrors     : hasSyntaxErrors
}

function hasSyntaxErrors() {
  try {
    _.each(locales, function(locale) {
      _.each(namespaces, function(namespaceFile, namespace) {
        var content, fileName = repository + (namespaceFile.route ? namespaceFile.route : namespaceFile) + '.' + locale;

        if(namespaceFile.format === 'yaml') {
          try { content = fs.readFileSync(fileName + '.yml', 'utf8'); }
          catch(err) { }

          content && YAML.parse(content);
        }
        else {
          try { content = fs.readFileSync(fileName + '.json', 'utf8'); }
          catch(err) { }

          content && JSON.parse(content);
        }
      });
    });
  }
  catch(err) { console.log(err); return true; }

  return false;
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

  namespaceFile && _.each(items, addTranslationKey);

  return new Promise(function(resolve, reject) {
    var unfinishedProcess = locales.length;

    _.each(locales, function(locale) {
      var fileName = repository;
      fileName += namespaceFile.route ? namespaceFile.route : namespaceFile;
      fileName += '.' + locale;
      fileName += '.' + ( namespaceFile.format === 'yaml' ? 'yml' : 'json' );

      var text = namespaceFile.format === 'yaml'
        ? YAML.stringify(translations[locale], 4)
        : beautify(JSON.stringify(translations[locale]), beautifyOptions);

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
    if(!item.original) return;

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
  var data, fileName = repository + (namespaceFile.route ? namespaceFile.route : namespaceFile) + '.' + locale;

  try {
    data = namespaceFile.format === 'yaml'
      ? YAML.load(fileName + '.yml')
      : require(fileName + '.json');
  }
  catch(err) {}

  return data || {};
}
