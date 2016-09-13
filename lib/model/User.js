"use strict";

// todo [akamel] rename to Account?

var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , crypto      = require('crypto')
  , randtoken   = require('rand-token')
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
  , secrets         : [String]
  , salt            : String
}, { collection : 'user' });

user_schema.pre('save', (next) => {
  if (!this.createdAt) {
    this.createdAt = new Date;
  }

  // if (!this.refresh_token) {
  //   this.refresh_token = randtoken.generate(32);
  // }

  if (!this.salt) {
    this.salt = randtoken.generate(32);
  }

  this.updatedAt = new Date;
  next();
})

user_schema.methods.issueJWT = function(options, cb) {
  var options = options || {}
    , key     = config.get('jwt.key')
    , payload = {
        sub       : this._id
      // , domain    : this.provider
    };

  return Promise
          .promisify(jwt.sign)(payload, key, { 
              algorithm : 'RS256'
            , expiresIn : _.clamp(_.get(options, 'expiresIn', Infinity), 0, config.get('jwt.expiresIn'))
          })
          .asCallback(cb);
};

user_schema.methods.putSecret = function(cb) {
  let secret  = randtoken.generate(32)
    , hash    = crypto.createHash('sha1').update(secret).digest('hex')
    ;

  return Promise
          .fromCallback((cb) => {
            this.update({ '$push' : { 'secrets' : hash } }, cb);
          })
          .then((result) => {
            return secret;
          })
          .asCallback(cb);
};

user_schema.methods.deleteSecret = function(hash, cb) {
  return Promise
          .fromCallback((cb) => {
            this.update({ '$pull' : { 'secrets' : hash } }, cb);
          })
          .asCallback(cb);
};


var User = mongoose.model('User', user_schema);

module.exports = User;