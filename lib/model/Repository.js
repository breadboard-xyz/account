"use strict";

var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , url         = require('url')
  , _           = require('lodash')
  , User        = require('./User')
  ;

class Repository {
  constructor(id) {
    this.remote = id;
  }

  permissions(sub) {
    return Promise
            .try(() => {
              return url.parse(this.remote);
            })
            .then((url_obj) => {
              // todo [akamel] make this smarter, detect empty username
              // todo [akamel] maybe use regex to detect .git at end of remote?
              let username = (url_obj.pathname || '').split('/')[1];

              return User
                      .findOne({ _id : sub })
                      .exec()
                      .then((user) => {
                        let provider = 'github';

                        return username === user.accounts[provider].username;
                        // return resource.username === user.accounts[resource.hostname].username;
                      });
            })
  }
}

module.exports = Repository;