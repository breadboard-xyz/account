var config      = require('config-url')
  , _           = require('lodash')
  , ipfilter    = require('express-ipfilter').IpFilter
  ;


let middleware = (req, res, next) => next();

if (_.size(config.get('account.ip-whitelist'))) {
  ipfilter(config.get('account.ip-whitelist'), { mode : 'allow', allowedHeaders : ['x-forwarded-for'] })
}

module.exports = {
  middleware
}
