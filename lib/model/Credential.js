"use strict";

var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , mongoose    = require('mongoose')
  , randtoken   = require('rand-token')
  , Schema      = mongoose.Schema
  ;

const jwt     = require('jsonwebtoken')
  ,   crypto  = require('crypto')
  ;

mongoose.Promise = Promise;

var credential_schema = new Schema({
    uri           : String
  , username      : String
  , password      : String
  , iat           : String
  , exp           : String
  , sub           : String
  , createdAt     : Date
}, { collection : 'credential' });

credential_schema.pre('save', (next) => {
  Promise
    .try(() => {
      if (!this.createdAt) {
        this.createdAt = new Date;
      }
    })
    .asCallback(next);
})

// todo [akamel] we use the token to encrypt, but we already have the payload
credential_schema.statics.upsert = (jwt_payload, uri, enc_token, cb) => {
  // todo [akamel] use mongodb upsert? how do we know it is new?
  // todo [akamel] should this be in redis instead? what about TTL? redis pubsub?
  return Credential
          .findOne({
              uri : uri
            , iat : jwt_payload.iat
            , exp : jwt_payload.exp
            , sub : jwt_payload.sub
          })
          .then((cred) => {
            if (cred) {
              var data = _.omit(cred.toJSON(), '__v', '_id');

              data.username = Credential.decrypt(enc_token, cred.username)
              data.password = Credential.decrypt(enc_token, cred.password)

              return { data : data };
            }

            var username  = randtoken.generate(16)
              , password  = randtoken.generate(16)
              ;

            var enc = {
                username  : Credential.encrypt(enc_token, username)
              , password  : Credential.encrypt(enc_token, password)
              , uri       : uri
              , iat       : jwt_payload.iat
              , exp       : jwt_payload.exp
              , sub       : jwt_payload.sub
            };

            return (new Credential(enc))
                      .save()
                      .then((cred) => {
                        var data  = _.omit(cred.toJSON(), '__v', '_id');

                        data.username = username;
                        data.password = password;

                        return {
                            data : data
                          , new  : true
                        }
                      });
          })
          .asCallback(cb);
};

credential_schema.statics.encrypt = (token, text) => {
  var cipher = crypto.createCipher('aes-128-cbc', token);

  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
};

credential_schema.statics.decrypt = (token, text) => {
  var decipher = crypto.createDecipher('aes-128-cbc', token);
    
  return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
};

var Credential = mongoose.model('Credential', credential_schema);

module.exports = Credential;