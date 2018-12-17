var bytes = require('bytes')
  , fs    = require('fs')
  , ms    = require('ms')
  ;

module.exports = {
  "jwt"         : {
    "key"       : fs.readFileSync('./.secrets/key/key', 'utf-8'),
    "public"    : fs.readFileSync('./.secrets/key/key.pub', 'utf-8'),
    "expiresIn" : ms('30m') / 1000
  },
  "account"     : {
    "port"          : 8050,
    "impersonate" : {
      "username"  : "a7medkamel"
    },
    "mongo"       : {
      "url"     : `mongodb://${fs.readFileSync('./.secrets/mongodb/username', 'utf-8')}:${fs.readFileSync('./.secrets/mongodb/password', 'utf-8')}@${fs.readFileSync('./.secrets/mongodb/host', 'utf-8')}/account`
    },
    "redis" : {
      "host"          : "localhost",
      "port"          : 6379,
      "password"      : null,
      "db"            : 0
    },
    "oauth" : {
      "callback"  : "https://www.breadboard.io/auth/callback",
      "strategy"  : [
        {
          "module"        : "passport-github2",
          "name"          : "github.com",
          "options"       : {
            "clientID"          : fs.readFileSync('./.secrets/oauth/strategy/github.com/id', 'utf-8'),
            "clientSecret"      : fs.readFileSync('./.secrets/oauth/strategy/github.com/secret', 'utf-8'),
            "authorizationURL"  : null, // "https://github.com/login/oauth/authorize",
            "tokenURL"          : null, // "https://github.com/login/oauth/access_token",
            "customHeaders"     : null, // {},
            "userProfileURL"    : null, // "https://api.github.com/user",
            "userEmailURL"      : null  // "https://api.github.com/user/emails",
          },
          "scope"         : [
            "user:email",
            "public_repo",
            "repo",
            "read:repo_hook",
            "write:repo_hook"
          ]
        }
      ]
    }
  },
  "backend"     : {
      "mongodb"   : {
        "host"      : fs.readFileSync('./.secrets/backend/mongodb/host', 'utf-8'),
        "port"      : 27017,
        "user"      : fs.readFileSync('./.secrets/backend/mongodb/user', 'utf-8'),
        "password"  : fs.readFileSync('./.secrets/backend/mongodb/password', 'utf-8')
      }
  }
};
