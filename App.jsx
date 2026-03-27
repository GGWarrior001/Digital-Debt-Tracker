import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [subscriptions, setSubscriptions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    category: 'Entertainment',
    billing_date: 1,
    website: '',
    trial_end_date: '',
    notes: ''
  });

  const categories = ['Entertainment', 'Software', 'Fitness', 'News', 'Productivity', 'Other'];

  // Check if logged in on mount
  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchSubscriptions();
      fetchAnalytics();
    }
  }, [token]);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSubscriptions(data);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingId) {
      // Update
      await fetch(`${API_URL}/subscriptions/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
    } else {
      // Create
      await fetch(`${API_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({
      name: '',
      cost: '',
      category: 'Entertainment',
      billing_date: 1,
      website: '',
      trial_end_date: '',
      notes: ''
    });
    fetchSubscriptions();
    fetchAnalytics();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this subscription?')) {
      await fetch(`${API_URL}/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchSubscriptions();
      fetchAnalytics();
    }
  };

  const handleEdit = (sub) => {
    setEditingId(sub.id);
    setFormData(sub);
    setShowModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsLoggedIn(false);
    setSubscriptions([]);
    setAnalytics(null);
  };

  if (!isLoggedIn) {
    return <AuthPage onLogin={(t) => { setToken(t); localStorage.setItem('token', t); }} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>💳 Debt Tracker</h1>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="dashboard-header">
              <h2>Your Subscriptions</h2>
              <button className="btn-primary" onClick={() => { setEditingId(null); setShowModal(true); }}>
                + Add Subscription
              </button>
            </div>

            {subscriptions.length === 0 ? (
              <div className="empty-state">
                <p>No subscriptions yet. Add one to get started!</p>
              </div>
            ) : (
              <div className="subscriptions-grid">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="subscription-card">
                    <div className="card-header">
                      <h3>{sub.name}</h3>
                      <span className={`badge ${sub.status}`}>{sub.status}</span>
                    </div>
                    <p className="category">{sub.category}</p>
                    <p className="cost">${sub.cost.toFixed(2)}<span>/month</span></p>
                    <p className="date">Billing: {sub.billing_date}th</p>
                    {sub.website && <p className="website"><a href={sub.website} target="_blank" rel="noopener noreferrer">Visit →</a></p>}
                    <div className="card-actions">
                      <button className="btn-sm btn-edit" onClick={() => handleEdit(sub)}>Edit</button>
                      <button className="btn-sm btn-delete" onClick={() => handleDelete(sub.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="analytics">
            <div className="metrics-grid">
              <div className="metric-card">
                <p className="metric-label">Monthly Spending</p>
                <p className="metric-value">${analytics.totalMonthly.toFixed(2)}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Yearly Spending</p>
                <p className="metric-value">${analytics.totalYearly.toFixed(2)}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Active Subscriptions</p>
                <p className="metric-value">{analytics.count}</p>
              </div>
            </div>

            <div className="breakdown">
              <h3>Spending by Category</h3>
              {Object.entries(analytics.byCategory).map(([cat, amount]) => (
                <div key={cat} className="breakdown-item">
                  <span>{cat}</span>
                  <div className="bar">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(amount / analytics.totalMonthly) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="amount">${amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Edit' : 'Add'} Subscription</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Netflix, Spotify"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost/Month *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                    placeholder="9.99"
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Billing Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.billing_date}
                    onChange={(e) => setFormData({ ...formData, billing_date: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Trial Ends</label>
                  <input
                    type="date"
                    value={formData.trial_end_date}
                    onChange={(e) => setFormData({ ...formData, trial_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any notes..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update' : 'Add'} Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthPage({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignup ? 'signup' : 'login';
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred');
      } else {
        onLogin(data.token);
      }
    } catch (err) {
      setError('Connection error. Make sure backend is running.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <h1>💳 Digital Debt Tracker</h1>
          <p className="tagline">Track subscriptions. Save money. Live better.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Login'}
            </button>
          </form>

          <p className="toggle-auth">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="link-btn"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
