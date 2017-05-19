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
  , User        = require('./model/User')
  , Credential  = require('./model/Credential')
  , Repository  = require('./model/Repository')
  , Mongo       = require('./model/backend/Mongo')
  // , CacheManager  = require('cache-manager')
  // , RedisStore    = require('cache-manager-redis')
  ;

// var cache = CacheManager.caching({
//     store       : RedisStore
//   , host        : config.get('cache.redis.host')
//   , port        : config.get('cache.redis.port')
//   , auth_pass   : config.get('cache.redis.password')
//   , db          : config.get('cache.redis.db')
//   , ttl         : 600
// });

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

// todo [akamel] auth_middleware due to req.user below
app.post('/mongodb/creds', auth_middleware, (req, res, next) => {
  var uri     = req.body.uri
    , auth    = auth_header.parse(req.get('authorization'))
    ;

  // verify sub owns github path
  let repo = new Repository(uri);
  repo
    .permissions(req.jwt_payload.sub)
    .then((permissions) => {
      if (!permissions) {
        throw new Error('access denied')
      }

      return Credential
              .upsert(req.jwt_payload, uri, auth.token)
              .then((result) => {
                if (result.new) {
                  return (new Mongo(uri))
                            .addUser(req.jwt_payload, result.data)
                            .then(() => result);
                }

                return result;
              })
              .then((result) => {
                let backend = new Mongo(uri)
                  , db_name = backend.getHash(req.jwt_payload)
                  ;

                // todo [akamel] get this from config
                result.data.db = db_name;
                result.data.hostname = 'db.breadboard.io';
                result.connection_string = `mongodb://${result.data.username}:${result.data.password}@${result.data.hostname}/${result.data.db}`

                res.send(result);
              });
    })
    .catch((err) => {
      next(err);
    })
});

app.post('/docusign/creds', auth_middleware, (req, res, next) => {
  var uri     = req.body.uri
    , auth    = auth_header.parse(req.get('authorization'))
    ;

  Promise
    .try(() => {
      return config.get('sdk.docusign');
    })
    .then((result) => {
      res.send({ data : result });
    })
    .catch((err) => {
      next(err);
    })
});


app.get('/account/:id/token/', ipfilter_middleware, (req, res, next) => {
  var id = req.params['id'];

  User
    .findById(id)
    .exec()
    .then((account) => {
      if (!account) {
        throw new Error('not found');
      }

      return account
              .issueJWT({ expiresIn : req.body.expiresIn })
              .then((token) => {
                res.send({ data : token });
              });
    })
    .catch((err) => {
      next(err);
    });
});

app.get('/account/:provider/:id/token', ipfilter_middleware, (req, res, next) => {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , query       = get_query(provider, id)
    ;

  User
    .findOne(query)
    .exec()
    .then((account) => {
      if (!account) {
        throw new Error('not found');
      }

      return account
              .issueJWT({ expiresIn : req.body.expiresIn })
              .then((token) => {
                res.send({ data : token });
              });
    })
    .catch((err) => {
      next(err);
    });
});

// todo [akamel] protect
app.put('/account/:id/secret/', (req, res, next) => {
  var id = req.params['id'];

  User
    .findById(id)
    .exec()
    .then((account) => {
      return account
              .putSecret()
              .then((result) => {
                res.send({ data : result });
              });
    })
    .catch((err) => {
      next(err);
    });
});

// todo [akamel] protect
app.delete('/account/:id/secret/:hash', (req, res, next) => {
  var id    = req.params['id']
    , hash  = req.params['hash']
    ;

  User
    .findById(id)
    .exec()
    .then((account) => {
      return account
              .deleteSecret(hash)
              .then(() => {
                // todo [akamel] send ok
                res.send({});
              });
    })
    .catch((err) => {
      next(err);
    });
});

// todo [akamel] protect ? already protected by token in path?
app.get('/account/:id/secret/:key/token', (req, res, next) => {
  let re      = /([0-9a-zA-Z+\/=]{12})\.([0-9a-zA-Z+\/=]{32})/
    , id      = req.params['id']
    , key     = req.params['key']
    ;

  User
    .findById(id)
    .exec()
    .then((account) => {
      let salt  = account.salt
        , match = re.exec(key)
        ;

      if (!match) {
        throw new Error('secret syntax error');
      }

      let prefix      = match[1]
        , secret_buf  = new Buffer(match[2], 'base64')
        , hash        = crypto.createHash('sha1', salt).update(secret_buf).digest('hex')
        ;

      if (!_.includes(account.secrets, `${prefix}.${hash}`)) {
        throw new Error('unknown secret');
      }

      return account
              .issueJWT()
              .then((token) => {
                res.send({ data : token, __account : account });
              });
    })
    .catch((err) => {
      next(err);
    });
});

function get_query(hostname, id) {
  let provider = User.lookupHost(hostname);

  if (_.isNaN(Number(id))) {
    let query = { provider : provider };
    query['accounts.' + provider + '.username'] = id;
    return query;
  } else {
    return { provider : provider, id : id };
  }
}

app.get('/account', auth_middleware, (req, res, next) => {
  let _id = req.jwt_payload.sub;

  User
    .findById(_id)
    .exec()
    .then((account) => {
      // res.send({ data : { token : _.get(account, 'accounts.' + provider + '._token') } });
      res.send({ data : account.sanitize() });
    })
    .catch((err) => {
      next(err);
    });
});

// todo [akamel] protect
app.post('/account/:provider/:id', (req, res, next) => {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , query       = get_query(provider, id)
    , model       = req.body
    ;

  User
    .findOneAndUpdate(query, model, { upsert : true, new : true })
    .exec()
    .then((account) => {
      res.send({ data : account });
    })
    .catch((err) => {
      next(err);
    }); 
});

// todo [akamel] protect
app.patch('/account/:provider/:id', (req, res, next) => {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , query       = get_query(provider, id)
    , cmd         = { $set : req.body }
    ;

  User
    .findOneAndUpdate(query, cmd, { upsert : false, new : true })
    .exec()
    .then((account) => {
      res.send({ data : account });
    })
    .catch((err) => {
      next(err);
    }); 
});

// todo [akamel] protect
app.get('/account/:provider/:id/', (req, res, next) => {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , query       = get_query(provider, id)
    ;

  Promise
    .try(() => {
      return User.findOne(query).exec();
    })
    .then((account) => {
      res.send({ data : account.sanitize() });
    })
    .catch((err) => {
      next(err);
    });
});

// todo [akamel] protect
app.get('/account/:provider/:id/git_token', (req, res, next) => {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , query       = get_query(provider, id)
    ;

  Promise
    .try(() => {
      return User.findOne(query).exec();
    })
    .then((account) => {
      res.send({ data : { token : _.get(account, 'accounts.' + provider + '._token') } });
    })
    .catch((err) => {
      next(err);
    });
});

// todo [akamel] protect
app.get('/account/:_id/', (req, res, next) => {
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