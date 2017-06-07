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

// strategy.info = {
//     name      : 'github'
//   , host      : 'github.com'
//   , text      : 'GitHub'
//   , icon      : 'fa fa-github-square'
//   , uri       : '/auth/github'
//   , color     : '#000'
//   , scope     : [
//         'user:email'
//       , 'public_repo'
//       , 'repo'
//       // , 'notifications'
//       // , 'gist'
//       , 'read:repo_hook'
//       , 'write:repo_hook'
//     ]
// };

module.exports = {
    enabled
};
