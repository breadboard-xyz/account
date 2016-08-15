var express     = require('express')
  , Promise     = require('bluebird')
  , bodyParser  = require('body-parser')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , express_jwt = require('express-jwt')
  // todo [akamel] remove this module
  , auth_header = require('auth-header')
  , mongoose    = require('mongoose')
  , User        = require('./model/User')
  , Credential  = require('./model/Credential')
  , Repository  = require('./model/Repository')
  , Mongo       = require('./model/backend/Mongo')
  ;

mongoose.connect(config.getUrl('mongo'));

var app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(req.url)
  next();
});

var auth_middleware = express_jwt({ 
    secret          : config.get('jwt.public')
  // , getToken  : (req) => req.body.token
  , algorithm       : 'RS256'
  , requestProperty : 'jwt_payload'
});


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

                console.log(result);
                res.send(result);
              });
    })
    .catch((err) => {
      next(err);
    })
});

function get_query(provider, id) {
  if (_.isNaN(Number(id))) {
    let query = { provider : provider };
    query['accounts.' + provider + '.username'] = id;
    return query;
  } else {
    return { provider : provider, id : id };
  }
}

app.post('/account/:provider/:id/token/', (req, res, next) => {
  var provider    = req.params['provider']
    , id          = req.params['id']
    , query       = get_query(provider, id)
    ;

  User
    .findOne(query)
    .exec()
    .then((account) => {
      return account
              .genToken({
                  expiresIn : req.body.expiresIn
              })
              .then((token) => {
                res.send({ data : token });
              });
    })
    .catch((err) => {
      next(err);
    });
});

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
      res.send({ data : account });
    })
    .catch((err) => {
      next(err);
    });
});

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

app.get('/account/:_id/', (req, res, next) => {
  var _id = req.params['_id'];

  User
    .findById(_id)
    .exec()
    .then((account) => {
      res.send({ data : account });
    })
    .catch((err) => {
      next(err);
    })
});

function listen(options, cb) {
  return Promise
          .promisify(app.listen, { context : app})(options.port)
          .nodeify(cb);
}

module.exports = {
    listen : listen
};