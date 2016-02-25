var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ShopSchema = new Schema({
  banner: String,
  city: String,
  location: {
    type: { type: String, required: true },
    coordinates: { type: [Number], required: true }
  }
});

ShopSchema.index({
  location: '2dsphere'
});

mongoose.model('Shop', ShopSchema);
