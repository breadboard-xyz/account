"use strict";

// todo [akamel] rename to Account?

var Promise     = require('bluebird')
  , config      = require('config')
  , _           = require('lodash')
  , mongoose    = require('mongoose')
  , Schema      = mongoose.Schema
  ;

const jwt = require('jsonwebtoken');

mongoose.Promise = Promise;

var user_schema = new Schema({
    provider        : String
  , id              : String
  , accounts        : Schema.Types.Mixed
  , createdAt       : Date
  , updatedAt       : Date
}, { collection : 'user__2' });

user_schema.pre('save', (next) => {
  if (!this.createdAt) {
    this.createdAt = new Date;
  }

  this.updatedAt = new Date;
  next();
})

user_schema.methods.issueJWT = function(options, cb) {
  return User.issueJWT(this._id, options).asCallback(cb);
};

var User = mongoose.model('User', user_schema);

User.reverseDNS = (provider) => {
  return _.chain(provider).split('.').reverse().join('.').value();
}

User.issueJWT = (sub, options) => {
  var options   = options || {}
    , key       = config.get('jwt.key')
    , expiresIn = _.get(options, 'expiresIn', Infinity)
    , payload   = { sub }
    ;

  return Promise
          .fromCallback((cb) => {
            jwt.sign(payload, key, {
                algorithm : 'RS256'
              , expiresIn : _.clamp(expiresIn, 0, config.get('jwt.expiresIn'))
            }, cb);
          });
};

module.exports = User;
