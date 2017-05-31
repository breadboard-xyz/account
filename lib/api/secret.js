var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  // todo [akamel] remove this module
  , User        = require('../model/User')
  ;

function create(req, res, next) {
  var id = req.params['id'];

  User
    .findById(id)
    .exec()
    .then((account) => {
      return account
              .putSecret()
              .then((result) => {
                res.send({ data : result });
              });
    })
    .catch((err) => {
      next(err);
    });
}

function del(req, res, next) {
  var id    = req.params['id']
    , hash  = req.params['hash']
    ;

  User
    .findById(id)
    .exec()
    .then((account) => {
      return account
              .deleteSecret(hash)
              .then(() => {
                // todo [akamel] send ok
                res.send({});
              });
    })
    .catch((err) => {
      next(err);
    });
}

function token(req, res, next) {
  let re      = /([0-9a-zA-Z+\/=]{12})\.([0-9a-zA-Z+\/=]{32})/
    , id      = req.params['id']
    , key     = req.params['key']
    ;

  User
    .findById(id)
    .exec()
    .then((account) => {
      let salt  = account.salt
        , match = re.exec(key)
        ;

      if (!match) {
        throw new Error('secret syntax error');
      }

      let prefix      = match[1]
        , secret_buf  = new Buffer(match[2], 'base64')
        , hash        = crypto.createHash('sha1', salt).update(secret_buf).digest('hex')
        ;

      if (!_.includes(account.secrets, `${prefix}.${hash}`)) {
        throw new Error('unknown secret');
      }

      return account
              .issueJWT()
              .then((token) => {
                res.send({ data : token, __account : account });
              });
    })
    .catch((err) => {
      next(err);
    });
}

module.exports = {
    create
  , del
  , token
}