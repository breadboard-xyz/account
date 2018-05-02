var config      = require('config-url')
  , _           = require('lodash')
  , express_jwt = require('express-jwt')
  ;

let middleware = express_jwt({
    secret          : config.get('jwt.public')
  // , getToken  : (req) => req.body.token
  , algorithm       : 'RS256'
  , requestProperty : 'jwt_payload'
});

module.exports = {
  middleware
}
