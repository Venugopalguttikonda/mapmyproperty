const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your_jwt_secret_key_here'; // Change this for production!

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/mapmyproperty', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Property schema and model
const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: String, required: true },
  description: String,
  contact: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const Property = mongoose.model('Property', propertySchema);

// Middleware to verify JWT token for protected routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied, token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Signup route
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  const existingUser = await User.findOne({ username });
  if (existingUser) return res.status(400).json({ error: 'Username already taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash });
  await user.save();

  console.log('User saved:', user);

  res.json({ message: 'User created successfully' });
});

// Login route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Login successful', token });
});

// Public route: GET all properties
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find().populate('createdBy', 'username');
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Protected route: POST new property
app.post('/api/properties', authenticateToken, async (req, res) => {
  try {
    console.log('Incoming property data:', req.body);
    console.log('Authenticated user:', req.user);

    const { title, price, description, contact, lat, lng } = req.body;
    if (!title || !price || !contact || lat == null || lng == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const property = new Property({
      title,
      price,
      description,
      contact,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      createdBy: req.user.userId,
    });

    await property.save();
    res.json(property);
  } catch (err) {
    console.error('Property Save Error:', err);
    res.status(500).json({ error: 'Failed to save property', details: err.message });
  }
});



// Basic root route
app.get('/', (req, res) => {
  res.send('Welcome to MapMyProperty API with Auth');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
