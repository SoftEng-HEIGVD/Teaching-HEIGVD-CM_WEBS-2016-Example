var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var PersonSchema = new Schema({
  name: {
    first: { type: String, required: true },
    last: { type: String, required: true }
  },
  age: { type: Number, min: 0 }
});

mongoose.model('Person', PersonSchema);
