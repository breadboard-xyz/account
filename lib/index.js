var express     = require('express')
  , Promise     = require('bluebird')
  , bodyParser  = require('body-parser')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , crypto      = require('crypto')
  , express_jwt = require('express-jwt')
  // todo [akamel] remove this module
  , auth_header = require('auth-header')
  , mongoose    = require('mongoose')
  , morgan      = require('morgan')
  , ipfilter    = require('express-ipfilter').IpFilter
  //
  , mongodb     = require('./api/mongodb')
  , docusign    = require('./api/docusign')
  , secret      = require('./api/secret')
  , auth        = require('./auth/index')
  //
  , User        = require('./model/User')
  , Credential  = require('./model/Credential')
  , Repository  = require('./model/Repository')
  , Mongo       = require('./model/backend/Mongo')
  ;

mongoose.connect(config.getUrl('mongo'));

var app = express();

app.use(bodyParser.json());

app.use(morgan('dev'));

var auth_middleware = express_jwt({
    secret          : config.get('jwt.public')
  // , getToken  : (req) => req.body.token
  , algorithm       : 'RS256'
  , requestProperty : 'jwt_payload'
});

var ipfilter_middleware = _.size(config.get('account.ip-whitelist'))
                            ? ipfilter(config.get('account.ip-whitelist'), { mode : 'allow', allowedHeaders : ['x-forwarded-for'] })
                            : (req, res, next) => next();


// todo: [akamel] fix docusign sdk, make sure it posts
app.post('/mongodb/creds', auth_middleware, mongodb.creds)
app.post('/docusign/creds', auth_middleware, docusign.creds)

// todo [akamel] protect ? already protected by token in path?
app.get('/account/:id/secret/:key/token', secret.token);
app.put('/account/:id/secret/', ipfilter_middleware, secret.create);
app.delete('/account/:id/secret/:hash', ipfilter_middleware, secret.del);

app.use(auth.passport.initialize());
app.use(auth.passport.session());
app.get('/auth/logout', auth.logout);
app.get('/auth/:provider', auth.login);
app.get('/auth/:provider/callback', auth.callback);

app.get('/account', auth_middleware, (req, res, next) => {
  let _id = req.jwt_payload.sub;

  User
    .findById(_id)
    .exec()
    .then((account) => {
      res.send({ data : account.sanitize() });
    })
    .catch((err) => {
      next(err);
    });
});

app.get('/account/:id/git_token', auth_middleware, (req, res, next) => {
  let _id = req.jwt_payload.sub
    , id  = req.params['id']
    ;

  Promise
    .try(() => {
      if (_id != id) {
        throw new Error('id mismatch');
      }

      return User.findOne({ _id }).exec();
    })
    .then((account) => {
      let rdns = User.reverseDNS(provider);

      res.send({ data : { token : _.get(account, `accounts.${rdns}._token`) } });
    })
    .catch((err) => {
      next(err);
    });
});

app.get('/account/:id/token/', ipfilter_middleware, (req, res, next) => {
  var { id }          = req.params
    , { expires_in }  = req.query
    ;

  User
    .findById(id)
    .exec()
    .then((account) => {
      if (!account) {
        throw new Error('not found');
      }

      return account
              .issueJWT({ expiresIn : expires_in })
              .then((token) => {
                res.send({ data : token });
              });
    })
    .catch((err) => {
      next(err);
    });
});

app.get('/account/:provider/:id/token', ipfilter_middleware, (req, res, next) => {
  var { id, provider }  = req.params
    , { expires_in }    = req.query
    , rdns              = User.reverseDNS(provider)
    , query             = {
          provider
        , [`accounts.${rdns}.username`] : id
      }
    ;

  User
    .findOne(query)
    .exec()
    .then((account) => {
      if (!account) {
        throw new Error('not found');
      }

      return account
              .issueJWT({ expiresIn : expires_in })
              .then((token) => {
                res.send({ data : token });
              });
    })
    .catch((err) => {
      next(err);
    });
});

app.get('/account/:provider/:id/git_token', ipfilter_middleware, (req, res, next) => {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , rdns        = User.reverseDNS(provider)
    , query       = {
          provider
        , [`accounts.${rdns}.username`] : id
      }
    ;

  Promise
    .try(() => {
      return User.findOne(query).exec();
    })
    .then((account) => {
      let rdns = User.reverseDNS(provider);

      res.send({ data : { token : _.get(account, `accounts.${rdns}._token`) } });
    })
    .catch((err) => {
      next(err);
    });
});

app.get('/account/:_id/', ipfilter_middleware, (req, res, next) => {
  var _id = req.params['_id'];

  User
    .findById(_id)
    .exec()
    .then((account) => {
      res.send({ data : account.sanitize() });
    })
    .catch((err) => {
      next(err);
    });
});

app.use(function(err, req, res, next) {
  switch (err.message) {
    case 'not found':
    res.status(404);
    break;
    default:
    res.status(500);
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401);
    err.message = 'unauthorized';
  }

  res.send({ message : err.message });
});

function listen(options, cb) {
  return Promise
          .promisify(app.listen, { context : app})(options.port)
          .nodeify(cb);
}

module.exports = {
    listen : listen
};
