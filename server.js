require('dotenv').config(); // Load environment variables

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

// Middleware    bhabhvhahvashbvhahvbhafhvhavhbabvahfavhadfhvhdabvhdfavhdbhvbdavdabhvhadvadbvadfbvhabdhvdabvahvadbhvdf
app.use(cors());
app.use(express.json());

// ======= MongoDB Connection =======
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', (err) => console.error('❌ MongoDB connection error:', err));
db.once('open', () => {
  console.log('✅ Connected to MongoDB');
});

// ✅ Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('/', (req, res) => {
  res.redirect('/signup.html');
});

// ======= User Schema & Model =======
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// ======= Property Schema & Model =======
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

// ======= JWT Auth Middleware =======
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied, token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ======= Routes =======

// Signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username & password required' });

  const existingUser = await User.findOne({ username });
  if (existingUser) return res.status(400).json({ error: 'Username already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash });
  await user.save();
  res.json({ message: 'Signup successful' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, message: 'Login successful' });
});

// Get all properties (public)
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find().populate('createdBy', 'username');
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Add a property (protected)
app.post('/api/properties', authenticateToken, async (req, res) => {
  try {
    const { title, price, description, contact, lat, lng } = req.body;
    if (!title || !price || !contact || lat == null || lng == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProperty = new Property({
      title,
      price,
      description,
      contact,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      createdBy: req.user.userId,
    });

    await newProperty.save();
    res.json(newProperty);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add property', details: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
