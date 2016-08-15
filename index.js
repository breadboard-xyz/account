var config    = require('config-url')
  , winston   = require('winston')
  , http      = require('./lib')
  ;

process.on('uncaughtException', function (err) {
  console.error(err.stack || err.toString());
});

function main() {
  return http
          .listen({ port : config.getUrlObject('account').port })
          .then(() => {
            winston.info('taskmill-core-account [started] :%d', config.getUrlObject('account').port);
          });
}

if (require.main === module) {
  main();
}

module.exports = {
  main  : main
};