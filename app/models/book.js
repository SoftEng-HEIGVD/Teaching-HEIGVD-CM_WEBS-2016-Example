var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var BookSchema = new Schema({
  title: { type: String, required: true },
  format: String,
  publisherId: { type: Schema.Types.ObjectId, required: true }
});

mongoose.model('Book', BookSchema);
