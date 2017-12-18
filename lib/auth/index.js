var Promise     = require('bluebird')
  , _           = require('lodash')
  , passport    = require('passport')
  , safe_parse  = require('safe-json-parse')
  , config      = require('config')
  , strategy    = require('./strategy')
  , handler     = require('./handler')
  , User        = require('../model/User')
  //
  , { URL, URLSearchParams } = require('url')
  ;

let strategies = strategy.enabled();

_.each(strategies, (s) => passport.use(s));

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser((_id, done) => {
  // set user to false will invalidate user and del session
  User
    .findById(_id)
    .exec()
    .then((user) => {
      return !!user? user : false;
    })
    .catch((err) => {
      return false;
    })
    .asCallback(done);
});

function authenticate(provider, req, res, next) {
  let { config:strategy_config } = strategies[provider] || {}
    , impersonate = config.has('account.impersonate.username')
                      ? config.get('account.impersonate.username')
                      : undefined
    ;

  let rdns = User.reverseDNS(provider);

  Promise
    .resolve(impersonate)
    .then((impersonate) => {
      if (impersonate) {
        return User
                .findOne({ provider, [`accounts.${rdns}.username`] : impersonate })
                .exec()
                .then((user) => {
                  if (!user) {
                    throw new Error('debug profile not found');
                  }

                  let profile                 = _.get(user.accounts, rdns)
                    , { _token, _tokenSecret} = profile
                    ;

                  req.provider = provider;
                  return handler.handler(req, _token, _tokenSecret, profile);
                });
      }

      // todo [akamel] we call this twice in both /auth and then in /callback; in /callback we don't need the params
      // todo [akamel] /login doesn't exist here
      var params = {
          failureRedirect   : '/login'
        , state             : JSON.stringify(req.query)
        , scope             : strategy_config.scope
      };

      return Promise.fromCallback((cb) => passport.authenticate(provider, params, cb)(req, res, next));
    })
    .then((user) => {
      return Promise
              .fromCallback((cb) => req.logIn(user, cb))
              .then(() => {
                return user.issueJWT({ expiresIn : 60 /*seconds*/ })
              })
              .then((token) => {
                let uri     = new URL(config.getUrl('account.oauth.callback'))
                  , search  = new URLSearchParams('')
                  ;

                search.append('token', token);
                search.append('sid', user._id.toString());

                uri.search = search;

                res.redirect(uri.toString());
              });
    })
    .catch((err) => {
      console.error(err);
      throw err;
    })
    .asCallback(next);
};

function login(req, res, next) {
  let { provider } = req.params;

  if (config.has('account.impersonate.username')) {
    res.redirect(`/auth/${provider}/callback`);
    return;
  }

  authenticate(provider, req, res, next);
}

function logout(req, res, next) {
  req.logout();
  next();
}

function callback(req, res, next) {
  let { provider } = req.params;

  authenticate(provider, req, res, next);
}

module.exports = {
    login
  , logout
  , callback
  , passport
};
