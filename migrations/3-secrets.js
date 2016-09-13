var Promise   = require('bluebird')
  , randtoken = require('rand-token')
  ;

module.exports.id = "secrets";

module.exports.up = function (done) {
  // // use this.db for MongoDB communication, and this.log() for logging
  // var coll = this.db.collection('user');

  // var cursor = coll.find();
  // // Execute the each command, triggers for each document

  // var waits = [];

  // cursor.each((err, item) => {
  //   // If the item is null then the cursor is exhausted/empty and closed
  //   if( item == null) {
  //     Promise
  //       .all(waits)
  //       .asCallback(done)
  //       .finally(() => {
  //         this.db.close();
  //       });
  //   } else {
  //     var p = Promise
  //               .fromCallback((cb) => {
  //                 coll.findOneAndUpdate({ _id : item._id }, { $unset : { 'refresh_token' : '' }, $set : { 'salt' : randtoken.generate(32) } }, cb);
  //               });

  //     waits.push(p);
  //   }
  // });
};

module.exports.down = function (done) {
  // use this.db for MongoDB communication, and this.log() for logging
  done();
};