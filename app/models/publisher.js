var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var PublisherSchema = new Schema({
  name: { type: String, required: true },
  addresses: [
    {
      city: { type: String, required: true },
      street: String
    }
  ]
});

mongoose.model('Publisher', PublisherSchema);
