var assert      = require('chai').assert;

var Promise     = require('bluebird')
  , winston     = require('winston')
  , config      = require('config')
  , _           = require('lodash')
  , async       = require('async')
  , MongoClient = require('mongodb').MongoClient
  ;

describe('Quota', function() {
  var mongodb = undefined;

  var host      = config.get('db.mongodb.host')
    , port      = config.get('db.mongodb.port')
    , db        = config.get('db.mongodb.spec.db')
    , username  = config.get('db.mongodb.spec.username')
    , pwd       = config.get('db.mongodb.spec.pwd')
    ;

  beforeEach(function(done) {
    MongoClient
      .connect(`mongodb://${username}:${pwd}@${host}:${port}/${db}`)
      .then((db) => {
        var col = db.collection('spec');

        Promise.resolve(col.drop()).catch(() => {}).asCallback(done);
      });
  });

  afterEach(function(done) {
    MongoClient
      .connect(`mongodb://${username}:${pwd}@${host}:${port}/${db}`)
      .then((db) => {
        var col = db.collection('spec');

        Promise.resolve(col.drop()).catch(() => {}).asCallback(done);
      });
  });

  it('should be full at 16mb', function(done) {
    this.timeout(20 * 1000);

    Promise
      .resolve(MongoClient.connect(`mongodb://${username}:${pwd}@${host}:${port}/${db}`))
      .then((db) => {
        var col = db.collection('spec');

        return Promise
                .fromCallback((cb) => {
                  // todo [akamel] put a limit here [in case of bug, we don't want to kill the db]
                  var i = 0;

                  async.forever((next) => {
                        var arr = _.times(10 * 1000, () => { return { idx : i++ }; });
                        Promise
                          .resolve(col.insertMany(arr))
                          .asCallback(next);
                      }, (err) => {
                        cb(undefined, i);
                      }
                  );
                })
                .then((count) => {
                  const target  = 180000;
                  const limit   = 180000 + 10 * 1000;

                  assert.isAtLeast(count, target, `wrote ${count} while expecting at least ${target}`);
                  assert.isAtMost(count, limit, `wrote ${count} while expecting at most ${limit}`);
                  done();
                })
                .catch((err) => {
                  done(err);
                })
                .finally(() => {
                  db.close();
                })
      });
  });
});