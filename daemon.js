#!/usr/bin/env node

var _ = require('underscore');
var servers = require('./config.js').servers;
var socketClient = require('socket.io-client');

var merge = _.debounce(require('./lib/merge'), 10 * 60 * 1000, true);

var tmsNotificationsServer = servers(servers['tms_notifications']);
//tmsNotificationsServer.on('merge', merge);
tmsNotificationsServer.on('merge', function() {
  console.log('Merge fired from tms'):
});

var gitNotificationsServer = servers(servers['git_notifications']);
gitNotificationsServer.on('postdeploy', function(data) {
  data.repository === 'desygner' && data.author !== 'borges' && merge();
});
