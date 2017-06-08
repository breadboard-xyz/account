// var github = require('./github');
var config  = require('config')
  , _       = require('lodash')
  , handler = require('../handler')
  ;

function enabled() {
  let strategies = config.get('account.oauth.strategy');

  return _
          .chain(strategies)
          .map((strategy) => {
            let defaults  = {
                                callbackURL       : strategy.callback
                              , passReqToCallback : true
                            }
              , opts      = _.defaults(defaults, strategy.options)
              , Strategy  = require(strategy.module).Strategy
              , ret       = new Strategy(opts, handler.handler)
              ;

            ret.name = strategy.name
            ret.config = strategy;

            return ret;
          })
          .keyBy('name')
          .value();
}

module.exports = {
    enabled
};
