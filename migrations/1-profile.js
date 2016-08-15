var Promise = require('bluebird');

module.exports.id = "profile";

module.exports.up = function (done) {
  // use this.db for MongoDB communication, and this.log() for logging
  // done();
  var coll = this.db.collection('user_account_server');

  var cursor = coll.find();
  // Execute the each command, triggers for each document

  var waits = [];

  cursor.each((err, item) => {
    // If the item is null then the cursor is exhausted/empty and closed
    if( item == null) {
      // Show that the cursor is closed
      // cursor.toArray((err, items) => {
      //   // console.log(items);
      //   // test.equal(null, err);

      //   // Let's close the db
      //   this.db.close();
      // });
      Promise
        .all(waits)
        .asCallback(done)
        .finally(() => {
          this.db.close();
        });
    } else {
      var p = Promise
                .fromCallback((cb) => {
                  coll.findOneAndUpdate({ _id : item._id }, { $set : { 'id' : item.provider_id } }, cb);
                });

      waits.push(p);
    }
  });

};

module.exports.down = function (done) {
  // use this.db for MongoDB communication, and this.log() for logging
  done();
};