var configPath;
var path = require('path');
var args = process.argv.slice(2);
var usage = 'Usage:' + ' <script> [options]\n' +
  'Options' + ':\n' +
  '  -c, --config PATH    Config file path\n' +
  '  -h, --help           Display help information\n';

args.length || displayUsage();
while(args.length) {
  var arg = args.shift();

  switch(arg) {
    case '-h':
    case '--help':
      displayUsage();
      break;

    case '-c':
    case '--config':
      configPath = args.shift();
      configPath = configPath || 'config.json';

      if(configPath[0] !== '/')
        configPath = path.normalize(path.join(process.cwd(), configPath));
      break;

    default:
      console.log('`' + arg + '`' + ' is not a valid option');
      displayUsage();
  }
}

module.exports = require(configPath);

function displayUsage() {
  console.log(usage);
  process.exit(1);
}
