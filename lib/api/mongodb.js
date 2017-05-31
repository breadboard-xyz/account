var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  // todo [akamel] remove this module
  , auth_header = require('auth-header')
  , Credential  = require('../model/Credential')
  , Repository  = require('../model/Repository')
  , Mongo       = require('../model/backend/Mongo')
  ;

function use(app, auth_middleware) {
  app.post('/mongodb/creds', auth_middleware, (req, res, next) => {
    var uri     = req.body.uri
      , auth    = auth_header.parse(req.get('authorization'))
      ;

    // verify sub owns github path
    let repo = new Repository(uri);
    repo
      .permissions(req.jwt_payload.sub)
      .then((permissions) => {
        if (!permissions) {
          throw new Error('access denied')
        }

        return Credential
                .upsert(req.jwt_payload, uri, auth.token)
                .then((result) => {
                  if (result.new) {
                    return (new Mongo(uri))
                              .addUser(req.jwt_payload, result.data)
                              .then(() => result);
                  }

                  return result;
                })
                .then((result) => {
                  let backend = new Mongo(uri)
                    , db_name = backend.getHash(req.jwt_payload)
                    ;

                  // todo [akamel] get this from config
                  result.data.db = db_name;
                  result.data.hostname = 'db.breadboard.io';
                  result.connection_string = `mongodb://${result.data.username}:${result.data.password}@${result.data.hostname}/${result.data.db}`

                  res.send(result);
                });
      })
      .catch((err) => {
        next(err);
      })
  });
}

module.exports = {
  use : use
}