var Promise     = require('bluebird')
  , passport    = require('passport')
  , safe_parse  = require('safe-json-parse')
  , Strategy    = require('passport-github2').Strategy
  , config      = require('config')
  , strategy    = require('./strategy')
  , handler     = require('./handler')
  , User        = require('../model/User')
  ;

passport.use(strategy.github);

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser((_id, done) => {
  // set user to false will invalidate user and del session
  User
    .findById(_id)
    .exec()
    .then((user) => {
      if (!user) {
        return false;
      }

      return user;
    })
    .catch((err) => {
      return false;
    })
    .asCallback(done);
});

function authenticate(provider, req, res, next) {
  let { info }    = strategy[provider]
    , impersonate = config.has('account.impersonate.username')
                      ? config.get('account.impersonate.username')
                      : undefined
    ;

  Promise
    .resolve(impersonate)
    .then((impersonate) => {
      if (impersonate) {
        return User
                .findOne({ provider, [`accounts.${provider}.username`] : impersonate })
                .exec()
                .then((user) => {
                  if (!user) {
                    throw new Error('debug profile not found');
                  }

                  let profile                 = user.accounts[provider]
                    , { _token, _tokenSecret} = profile
                    ;

                  return handler(req, _token, _tokenSecret, profile);
                });
      }

      // todo [akamel] we call this twice in both /auth and then in /callback; in /callback we don't need the params
      // todo [akamel] /login doesn't exist here
      var params = {
          failureRedirect   : '/login'
        , state             : JSON.stringify(req.query)
        , scope             : info.scope
      };

      return Promise.fromCallback((cb) => passport.authenticate(provider, params, cb)(req, res, next));
    })
    .then((user) => {
      return Promise
              .fromCallback((cb) => req.logIn(user, cb))
              .then(() => {
                return Promise
                        .fromCallback((cb) => safe_parse(req.query['state'], cb))
                        .catch((err) => {})
                        .then((obj = {}) => {
                          // todo [akamel] assumes provider will be present
                          let username  = user.accounts[provider].username
                            , uri       = obj.uri || `/${info.host}/${username}`
                            ;
                          
                          res.redirect(uri)
                        });
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

function callback(req, res, next) {
  let { provider } = req.params;

  authenticate(provider, req, res, next);
}

module.exports = {
    login
  , callback
  , passport
};