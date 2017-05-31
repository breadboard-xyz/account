var config    = require('config')
  , urljoin   = require('url-join')
  , Strategy  = require('passport-github2').Strategy
  , handler   = require('./handler')
  ;

function cb_url(strategy) {
  return urljoin(config.getUrl('account'), 'auth', strategy, 'callback');
}

let github = new Strategy({
                  clientID          : config.get('account.oauth.github.id')
                , clientSecret      : config.get('account.oauth.github.secret')
                , callbackURL       : cb_url('github')
                , passReqToCallback : true
              }, handler);

github.info = {
    name      : 'github'
  , host      : 'github.com'
  , text      : 'GitHub'
  , icon      : 'fa fa-github-square'
  , uri       : '/auth/github'
  , color     : '#000'
  , enabled   : true
  , scope     : [
        'user:email'
      , 'public_repo'
      , 'repo'
      // , 'notifications'
      // , 'gist'
      , 'read:repo_hook'
      , 'write:repo_hook'
    ]
};

module.exports = {
  github
};