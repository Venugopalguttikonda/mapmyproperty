const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: String,
  price: String,
  description: String,
  contact: String,
  lat: Number,
  lng: Number,
});

module.exports = mongoose.model('Property', propertySchema);
