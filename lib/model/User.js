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
  let salt = this.salt;

  return Promise
          .all([
              Promise.fromCallback((cb) => crypto.randomBytes(24, cb))
            , Promise.fromCallback((cb) => crypto.randomBytes(8, cb))
          ])
          .spread((secret_buf, prefix_buf) => {
            let hash    = crypto.createHash('sha1', salt).update(secret_buf).digest('hex')
              , secret  = secret_buf.toString('base64')
              , prefix  = prefix_buf.toString('base64')
              ;

            return Promise
                    .fromCallback((cb) => {
                      this.update({ '$push' : { 'secrets' : `${prefix}.${hash}` } }, cb);
                    })
                    .then(() => {
                      return { secret : secret, prefix : prefix };
                    });
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

user_schema.methods.sanitize = function() {
  let ret = this.toJSON();

  ret.secrets = _.map(ret.secrets, (secret) => {
                  let re    = /([0-9a-zA-Z+\/=]{12})\.([0-9a-zA-Z+\/=]{32})/
                    , match = re.exec(secret)
                    ;

                    return `${match[1]}.${_.repeat('*', 32)}`;
                });

  return ret;
};

user_schema.statics.lookupHost = (hostname) => {
  switch(hostname) {
    case 'github.com':
    return 'github';
    case 'gitlab.com':
    return 'gitlab';
    case 'bitbucket.org':
    return 'bitbucket';
    default:
    return hostname;
  }
}

var User = mongoose.model('User', user_schema);

module.exports = User;