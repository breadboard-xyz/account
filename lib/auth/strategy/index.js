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
            let Strategy  = require(strategy.module).Strategy;
            //
            let defaults       = {
                                callbackURL       : strategy.callback
                              , passReqToCallback : true
                            };

            let cb = (req, ...args) => { 
              req.provider = strategy.name;
              handler.handler(req, ...args);
            };

            let opts      = _.defaults(defaults, strategy.options)
              , ret       = new Strategy(opts, cb)
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
