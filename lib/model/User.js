"use strict";

// todo [akamel] rename to Account?

var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , mongoose    = require('mongoose')
  , Schema      = mongoose.Schema
  ;

const jwt = require('jsonwebtoken');

mongoose.Promise = Promise;

var user_schema = new Schema({
    provider      : String
  , id            : String
  , accounts      : Schema.Types.Mixed
  , createdAt     : Date
  , updatedAt     : Date
}, { collection : 'user' });

user_schema.pre('save', (next) => {
  if (!this.createdAt) {
    this.createdAt = new Date;
  }
  this.updatedAt = new Date;
  next();
})

user_schema.methods.genToken = function(options, cb) {
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

var User = mongoose.model('User', user_schema);

module.exports = User;