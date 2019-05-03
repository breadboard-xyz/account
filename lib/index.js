var express     = require('express')
  , Promise     = require('bluebird')
  , retry       = require('bluebird-retry')
  , bodyParser  = require('body-parser')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , mongoose    = require('mongoose')
  , morgan      = require('morgan')
  //
  , key         = require('./api/key')
  , account     = require('./api/account')
  //
  , jwt         = require('./middleware/jwt')
  //
  , auth        = require('./auth/index')
  , health      = require('express-healthcheck')
  , ms          = require('ms')
  ;

let username = config.get('account.mongo.username')
  , password = config.get('account.mongo.password')
  , hostname = config.get('account.mongo.hostname')
  , database = config.get('account.mongo.database')
  , mongostr = `mongodb://${hostname}:27017/${database}`
  , options  = { useNewUrlParser: true }
  ;

if (!_.isEmpty(username)) {
  _.set(options, 'auth.user', username);
}

if (!_.isEmpty(password)) {
  _.set(options, 'auth.password', password);
}

retry(() => {
  return mongoose.connect(mongostr, options);
}, { interval : ms('1s'), max_interval : ms('2s'), backoff : 2, max_tries : -1 })
.then((result) => {
  winston.info('connected to database')
});

var app = express();

app.use(bodyParser.json());
app.use('/health', health());

app.use(morgan('dev'));

app.put('/account/:sub/key/', jwt.middleware, key.create);
app.get('/key/:key', key.get);

app.use(auth.passport.initialize());
app.use(auth.passport.session());

app.get('/auth/logout', auth.logout);
app.get('/auth/:provider', auth.login);
app.get('/auth/:provider/callback', auth.callback);

app.get('/account', jwt.middleware, account.get_by_jwt);
app.get('/account/:_id/', account.get);

app.get('/account/:id/git_token', jwt.middleware, account.get_git_token);
app.get('/account/:provider/:id/git_token', account.get_git_token_by_provider_id);

app.get('/account/:id/token/', account.issue_token);
app.get('/account/:provider/:id/token', account.issue_token_by_provider_id);

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
          .promisify(app.listen, { context : app })(options.port)
          .nodeify(cb);
}

module.exports = {
    listen : listen
};
