var config_url  = require('config-url')
  , winston     = require('winston')
  , http        = require('./lib')
  ;

process.on('uncaughtException', (reason) => {
  winston.error(reason.stack || reason.toString());
});

process.on('unhandledRejection', (reason, promise) => {
  winston.error(reason.stack || reason.toString());
});

function main() {
  let { port } = config_url.url('account');

  return http
          .listen({ port })
          .then(() => {
            winston.info('taskmill-core-account [started] :%d', port);
          });
}

if (require.main === module) {
  main();
}

module.exports = {
  main  : main
};