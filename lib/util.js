var _ = require('underscore');
var locales = require('../config').dialect.locales;
var repository = require('../config').repository;
var namespaces = require('../config').namespaces;

var getFile = _.memoize(_getFile);

module.exports = {
  forEachNamespaceFile: forEachNamespaceFile
}

function forEachNamespaceFile(callback, l) {
  _.each(l ? [ l ] : locales, function(locale) {
    _.each(namespaces, function(namespaceFile, namespace) {
      callback(getFile(namespaceFile, locale), namespace, locale);
    });
  });
}

function _getFile(namespaceFile, locale) {
  var data, fileName = repository + namespaceFile + '.' + locale + '.json';

  try { data = require(fileName) }
  catch(err) { data = {}; }

  return data;
}
