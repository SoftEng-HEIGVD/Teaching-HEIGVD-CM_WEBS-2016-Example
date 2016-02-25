var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var BookSchema = new Schema({
  title: { type: String, required: true },
  format: String,
  publisher: { type: Schema.Types.ObjectId, ref: 'Publisher', required: true }
});

mongoose.model('Book', BookSchema);
