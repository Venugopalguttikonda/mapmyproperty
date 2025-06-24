const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// Add property
router.post('/', async (req, res) => {
  const { title, price, description, contact, lat, lng } = req.body;
  const newProperty = new Property({ title, price, description, contact, lat, lng });
  await newProperty.save();
  res.json(newProperty);
});

// Get all properties
router.get('/', async (req, res) => {
  const properties = await Property.find();
  res.json(properties);
});

module.exports = router;
