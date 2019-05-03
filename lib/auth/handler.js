var Promise   = require('bluebird')
  , User      = require('../model/User')
  ;

function handler(req, token, tokenSecret, profile, done) {
  // todo [akamel] this will call db twice for each req?
  var { id }        = profile
    , { provider }  = req
    , query         = { provider, id }
    ;

  return Promise
          .resolve(req.user)
          .then((user) => {
            if (user) {
              return user;
            }

            return User.findOne(query).exec();
          })
          .then((user) => {
            profile._token = token;
            profile._tokenSecret = tokenSecret;

            let rdns = User.reverseDNS(provider);

            if (!user) {
              let model = {
                  provider
                , id
                , [`accounts.${rdns}`] : profile
              };

              return User.findOneAndUpdate(query, model, { upsert : true, new : true }).exec();
            } else {
              let patch = {
                [`accounts.${rdns}`] : profile
              };

              // todo [akamel] why does this have new = true?
              return User.findOneAndUpdate(query, { $set : patch }, { upsert : false, new : true }).exec();
            }
          })
          .asCallback(done);
};

module.exports = {
  handler
};
