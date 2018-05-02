var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  // todo [akamel] remove this module
  , User        = require('../model/User')
  ;

function get(req, res, next) {
  var _id = req.params['_id'];

  User
    .findById(_id)
    .exec()
    .then((account) => {
      res.send({ data : account.sanitize() });
    })
    .catch((err) => {
      next(err);
    });
}

function get_by_jwt(req, res, next) {
  let _id = req.jwt_payload.sub;

  User
    .findById(_id)
    .exec()
    .then((account) => {
      res.send({ data : account.sanitize() });
    })
    .catch((err) => {
      next(err);
    });
}

function get_git_token(req, res, next) {
  let _id = req.jwt_payload.sub
    , id  = req.params['id']
    ;

  Promise
    .try(() => {
      if (_id != id) {
        throw new Error('id mismatch');
      }

      return User.findOne({ _id }).exec();
    })
    .then((account) => {
      let rdns = User.reverseDNS(provider);

      res.send({ data : { token : _.get(account, `accounts.${rdns}._token`) } });
    })
    .catch((err) => {
      next(err);
    });
}

function issue_token(req, res, next) {
  var { id }          = req.params
    , { expires_in }  = req.query
    ;

  User
    .findById(id)
    .exec()
    .then((account) => {
      if (!account) {
        throw new Error('not found');
      }

      return account
              .issueJWT({ expiresIn : expires_in })
              .then((token) => {
                res.send({ data : token });
              });
    })
    .catch((err) => {
      next(err);
    });
}

function issue_token_by_provider_id(req, res, next) {
  var { id, provider }  = req.params
    , { expires_in }    = req.query
    , rdns              = User.reverseDNS(provider)
    , query             = {
          provider
        , [`accounts.${rdns}.username`] : id
      }
    ;

  User
    .findOne(query)
    .exec()
    .then((account) => {
      if (!account) {
        throw new Error('not found');
      }

      return account
              .issueJWT({ expiresIn : expires_in })
              .then((token) => {
                res.send({ data : token });
              });
    })
    .catch((err) => {
      next(err);
    });
}

function get_git_token_by_provider_id(req, res, next) {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , rdns        = User.reverseDNS(provider)
    , query       = {
          provider
        , [`accounts.${rdns}.username`] : id
      }
    ;

  Promise
    .try(() => {
      return User.findOne(query).exec();
    })
    .then((account) => {
      let rdns = User.reverseDNS(provider);

      res.send({ data : { token : _.get(account, `accounts.${rdns}._token`) } });
    })
    .catch((err) => {
      next(err);
    });
}

module.exports = {
    get
  , get_by_jwt
  , get_git_token
  , get_git_token_by_provider_id
  , issue_token
  , issue_token_by_provider_id
}
