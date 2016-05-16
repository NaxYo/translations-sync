#!/usr/bin/env node

require('date-format-lite');

var fs = require('fs');
var _ = require('underscore');
var Promise = require('promise');
var config = require('./config.json');
var exec = require('child_process').exec;
var servers = config.servers;
var socketClient = require('socket.io-client');

var debouncedMerge = _.debounce((function() {
  var isLocked = false;

  return function() {
    if(isLocked) return;
    isLocked = true;
    doMerge().then(function() { isLocked = false; });
  }
})(), 10 * 60 *  1000, true);

var tmsNotificationsServer = socketClient(servers['tms_notifications']);
tmsNotificationsServer.on('merge', function() {
  var now = new Date();
  log(now.format('[hh:mm:ss] ') + 'Merge fired from tms');
  debouncedMerge();
});

var gitNotificationsServer = socketClient(servers['git_notifications']);
gitNotificationsServer.on('postdeploy', function(data) {
  if(data.repository === config['repo_name'] && data.author !== config['repo_user']) {
    var now = new Date();
    log(now.format('[hh:mm:ss] ') + 'Merge fired from git');
    debouncedMerge();
  }
});

function doMerge() {
  return new Promise(function(resolve) {
    var now = new Date();
    var output = '\n====== ';
    output += now.format('DD/MM/YY hh:mm:ss');
    output += ' ======n';

    exec('./lib/merge.js', function(err, stdout, stderr) {
      now = new Date();

      output += stdout + ( err ? stderr : '' );
      output = '\n====== ';
      output += now.format('DD/MM/YY hh:mm:ss');
      output += ' ======';
      log(output);
      resolve();
    });
  });
}

function log(data) {
  console.log(data);
  fs.appendFile('daemon.log', data + '\n');
}
