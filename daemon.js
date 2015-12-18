var merge = require('./lib/merge');
var config = require('./config.js');
var socket = require('socket.io-client')(config['post_hub_server']);

socket.on('postdeploy', function(data) {
  data.repository === 'desygner' && merge();
});
