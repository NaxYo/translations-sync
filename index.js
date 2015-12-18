var nodegit = require('nodegit');
var exec = require('child_process').exec;
var repository = require('./config').repository;

var dbRefresh = require('./lib/db-refresh');
/*
module.exports = {
  pull : pull,
  push : push
};
*/

gitPull();

function gitPull() {
  var prePullReference;

  console.log('Starting pull process:');
  processRef()
    .then(processPull);
/*
  generateFiles()
    .then(processRef)
    .then(processPull)
*/
  function processRef() {
    var promise = new Promise(function(resolve, reject) {
      var onFinish = getExecWrapper(resolve, reject, extractRef);
      exec('git show-ref -s --abbrev', { cwd: repository }, onFinish);
    });

    return promise;

    function extractRef(result, resolve) {
      prePullReference = result.split('\n')[0];
      console.log('\t+ Pre-pull reference: ' + prePullReference);
      resolve();
    }
  }

  function processPull() {
    var promise = new Promise(function(resolve, reject) {
      var onFinish = getExecWrapper(resolve, reject, log);
      exec('git pull', { cwd: repository }, onFinish);
    });

    return promise;

    function log(result, resolve) {
      var postPullReference = result
        .split('\n')[0]
        .split('..')[1];

      postPullReference = postPullReference || prePullReference;
      console.log('\t+ Post-pull reference: ' + postPullReference);
      resolve();
    }
  }

  function processDiff() {

  }

  function refresh() {
    // save .json backup
    dbRefresh();
    gitPush();
  }
}

function generateFiles() {

}

function getExecWrapper(resolve, reject, callback) {
  return function(err, stdout, stderr) {
    err && onError(err, stderr);
    err || callback(stdout, resolve, reject);
  };

  function onError(err, stderr) {
    console.log(stderr);
    reject();
  }
}
