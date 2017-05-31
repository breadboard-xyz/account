var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  // todo [akamel] remove this module
  , auth_header = require('auth-header')
  ;

function use(app, auth_middleware) {
  app.post('/docusign/creds', auth_middleware, (req, res, next) => {
    var uri     = req.body.uri
      , auth    = auth_header.parse(req.get('authorization'))
      ;

    Promise
      .try(() => {
        return config.get('sdk.docusign');
      })
      .then((result) => {
        res.send({ data : result });
      })
      .catch((err) => {
        next(err);
      })
  });
}

module.exports = {
  use : use
}