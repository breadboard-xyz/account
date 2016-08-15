"use strict";

var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , querystring = require('querystring')
  , Server      = require('mongodb').Server
  , Db          = require('mongodb').Db
  ;

const crypto = require('crypto');

var mongodb = new Server(config.get('backend.mongodb.host'), config.get('backend.mongodb.port'));
// var user_db = Promise
//                 .try(() => {
//                   let server = new Server(config.get('backend.mongodb.host'), config.get('backend.mongodb.port'));


//                 })
class Mongo {
  constructor(uri) {
    this.uri = uri;
  }

  getHash(token_payload) {
    // todo [akamel] assumes that the uri doesn't have querystring already
    // var key   = this.uri + '?' + querystring.stringify({ sub : token_payload.sub })
    var key   = this.uri
      , hash  = crypto.createHash('md5').update(key).digest('hex')
      ;
    
    return `${hash}_${token_payload.sub}`;
  }

  addUser(token_payload, cred) {
    var hash = this.getHash(token_payload);

    return Promise
            .try(() => {
              var db = new Db('admin', mongodb);
              return db.open();
            })
            .tap((db) => {
              return db.authenticate(config.get('backend.mongodb.user'), config.get('backend.mongodb.password'));
            })
            .then((db) => {
              var hash_db = db.db(hash);

              var username = token_payload.sub;

              return Promise
                        .resolve(hash_db.addUser(cred.username, cred.password, { roles : ['readWrite'] }))
                        .finally(() => {
                          // todo [akamel] close the 'hash_db' as well?
                          db.close();
                        });
            });
  }

  // getStats(token_payload) {
  //   return Promise
  //           .all([
  //               this.getHash(token_payload)
  //           ])
  //           .spread((hash) => {
  //             var db = new Db(hash, mongodb);

  //             return db
  //                     .open()
  //                     .then((db) => {
  //                       return Promise
  //                                 .resolve(db.stats())
  //                                 .finally(() => {
  //                                   db.close();
  //                                 });
  //                     });
              
  //           });
  // }
}

module.exports = Mongo;