const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database(':memory:');

// Middleware
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'process.env.JWT_SECRET || 'fallback-for-dev-only';

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cost REAL NOT NULL,
    category TEXT,
    billing_date INTEGER,
    website TEXT,
    status TEXT DEFAULT 'active',
    trial_end_date DATE,
    last_used_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL,
    alert_type TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id)
  )`);
});

// Auth Routes
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email, hashedPassword],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      
      const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, userId: this.lastID, email });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id, email: user.email });
  });
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Subscription Routes
app.get('/api/subscriptions', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY billing_date ASC',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.post('/api/subscriptions', verifyToken, (req, res) => {
  const { name, cost, category, billing_date, website, trial_end_date, notes } = req.body;
  
  db.run(
    `INSERT INTO subscriptions (user_id, name, cost, category, billing_date, website, trial_end_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, name, cost, category, billing_date, website, trial_end_date, notes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, user_id: req.userId, name, cost, category, billing_date, website, trial_end_date, notes });
    }
  );
});

app.put('/api/subscriptions/:id', verifyToken, (req, res) => {
  const { name, cost, category, billing_date, website, status, trial_end_date, notes } = req.body;
  
  db.run(
    `UPDATE subscriptions SET name = ?, cost = ?, category = ?, billing_date = ?, website = ?, status = ?, trial_end_date = ?, notes = ?
     WHERE id = ? AND user_id = ?`,
    [name, cost, category, billing_date, website, status, trial_end_date, notes, req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/subscriptions/:id', verifyToken, (req, res) => {
  db.run(
    'DELETE FROM subscriptions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Analytics endpoint
app.get('/api/analytics', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const subs = rows || [];
      const totalMonthly = subs.reduce((sum, sub) => sum + sub.cost, 0);
      const totalYearly = totalMonthly * 12;
      
      const byCategory = {};
      subs.forEach(sub => {
        const cat = sub.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + sub.cost;
      });
      
      res.json({
        totalMonthly: parseFloat(totalMonthly.toFixed(2)),
        totalYearly: parseFloat(totalYearly.toFixed(2)),
        byCategory,
        count: subs.length
      });
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
