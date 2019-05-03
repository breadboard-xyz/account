var Promise       = require('bluebird')
  , config        = require('config')
  , config_redis  = require('config-redis')
  , randtoken     = require('rand-token')
  , redis         = require('redis')
  , User          = require('../model/User')
  ;

const jsonwebtoken = require('jsonwebtoken');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

let redis_client = redis.createClient(config_redis.options('account.redis'));

const expiresIn = 1 /*h*/ * 60 /*min*/ * 60 /*sec*/;

function create(req, res, next) {
  let { sub } = req.params;

  User
    .issueJWT(sub, { expiresIn })
    .then((jwt) => {
      let key = randtoken.generate(20)
        , obj = { sub, jwt }
        ;

      return redis_client
              .setAsync(key, JSON.stringify(obj))
              .then(() => {
                return key;
              });
    })
    .then((key) => {
      res.send({ data : { key } });
    })
    .catch((err) => {
      next(err);
    });
}

function get(req, res, next) {
  let { key } = req.params;

  redis_client
    .getAsync(key)
    .then((result) => {
      if (!result) {
        throw new Error('not found');
      }

      let { sub, jwt } = JSON.parse(result);

      return Promise
              .fromCallback((cb) => {
                let secret = config.get('jwt.public');
                jsonwebtoken.verify(jwt, secret, { algorithm : 'RS256'}, (err, decoded) => cb(undefined, { err, decoded }));
              })
              .then((result) => {
                let { err, decoded } = result;

                if (err) {
                  return User
                          .issueJWT(sub, { expiresIn })
                          .then((jwt) => {
                            let obj = { sub, jwt };

                            return redis_client.setAsync(key, JSON.stringify(obj)).then(() => jwt);
                          });
                }

                return jwt;
              })
              .then((jwt) => {
                res.send({ data : { jwt, sub } });
              });
    })
    .catch((err) => {
      next(err);
    });
}

module.exports = {
    create
  , get
  // , del
  // , token
}
