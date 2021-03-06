#!/usr/bin/env node

var _ = require('underscore');
var Promise = require('promise');
var exec = require('child_process').exec;
var branch = require('./config').repo_branch;
var repository = require('./config').repository;
var commitMessage = require('./config').commit_message;

var dbRefresh = require('./db-refresh');
var filesRefresh = require('./files-refresh');

var prePullReference;

(function() {
  if(module.parent) module.exports = mergeTranslations;
  else mergeTranslations();
})();

function mergeTranslations() {
  console.log('Starting pull process:');

  generateFiles()
    .then(processRef)
    .then(processCommit)
    .then(processPull)
    .then(processPush)
    .then(refreshDB);
}

function processRef() {
  return new Promise(function(resolve, reject) {
    var onFinish = getExecWrapper(resolve, reject, extractRef);
    exec('git show-ref -s --abbrev', { cwd: repository }, onFinish);
  });

  function extractRef(result, resolve) {
    prePullReference = result.split('\n')[0];
    console.log('\t+ Pre-pull reference: ' + prePullReference);
    resolve();
  }
}

function processCommit() {
  return new Promise(function(resolve, reject) {
    isCommitNeeded().then(function(isCommitNeeded) {
      if(isCommitNeeded) {
        doCommit().then(function(result) {
          console.log('\t+ Pre-pull commit: ' + result.split('\n')[1]);
          resolve();
        });
      }
      else {
        console.log('\t+ Nothing to commit...');
        resolve();
      }
    });
  });
}

function processPull() {
  return new Promise(function(resolve, reject) {
    var onFinish = getExecWrapper(resolve, reject, log);
    exec('git pull ' + branch + ' -q', { cwd: repository }, onFinish);
  });

  function log(result, resolve) {
    var postPullReference = result
      .split('\n')[0]
      .split('..')[1];

    postPullReference = postPullReference || prePullReference;
    console.log('\t+ Post-pull reference: ' + postPullReference);
    resolve();
  }
}

function processPush() {
  return new Promise(function(resolve, reject) {
    doPush().then(function(result) {
      console.log('\t+ Changes pushed');
      resolve();
    });
    // isPushNeeded().then(function(isPushNeeded) {
    //   if(isPushNeeded) {
    //     doPush().then(function(result) {
    //       console.log('\t+ Changes pushed');
    //       resolve();
    //     });
    //   }
    //   else {
    //     console.log('\t+ Nothing to push...');
    //     resolve();
    //   }
    // });
  });
}

function refreshDB() {
    return dbRefresh().then(function() {
      console.log('\t+ Changes merged to the local DB');
    });
}

function isCommitNeeded() {
  return new Promise(function(resolve, reject) {
    var onFinish = getExecWrapper(resolve, reject, checkCommitNeeded);
    exec('git status', { cwd: repository }, onFinish);
  });

  function checkCommitNeeded(result, resolve) {
    resolve(result.split('\n')[2].indexOf('nothing to commit') < 0);
  }
}

function isPushNeeded() {
  return new Promise(function(resolve, reject) {
    var onFinish = getExecWrapper(resolve, reject, checkCommitNeeded);
    exec('git status', { cwd: repository }, onFinish);
  });

  function checkCommitNeeded(result, resolve) {
    resolve(
      result.indexOf('(use "git push" to publish your local commits)') > -1 ||
      result.indexOf('Your branch is ahead of') > -1
    );
  }
}

function doCommit() {
  return new Promise(function(resolve, reject) {
    var onFinish = getExecWrapper(null, reject, commitCommand);
    exec('git add .', { cwd: repository }, onFinish);

    function commitCommand() {
      var spawn = require('child_process').spawn('git', ['commit', '-am"' + commitMessage + '"'], { cwd: repository });
      var errorText = spawn.stderr.toString().trim();

      resolve(errorText || spawn.stdout.toString());
      //exec('git commit -am"' + commitMessage + '"', { cwd: repository }, );
    }
  });
}

function doPush() {
  return new Promise(function(resolve, reject) {
    var onFinish = getExecWrapper(resolve, reject, resolve);
    exec('git push', { cwd: repository }, onFinish);
  });
}

function generateFiles() {
  return new Promise(function(resolve, reject) {
    filesRefresh().then(function() {
      console.log('Files generated');
      resolve();
    });
  });
}

function getExecWrapper(resolve, reject, callback) {
  return function(err, stdout, stderr) {
    err && onError(err, stderr);
    err || callback(stdout, resolve, reject);
  };

  function onError(err, stderr) {
    console.log(err + '.\n' + stderr);
    reject();
  }
}
