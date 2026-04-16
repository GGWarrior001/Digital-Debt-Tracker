import React, { useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function AuthPage({ onLogin }) {
  const [isSignup,  setIsSignup]  = useState(false);
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const { dark, toggle }          = useDarkMode();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isSignup ? 'signup' : 'login';
      const res  = await fetch(`${API_URL}/auth/${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'An error occurred');
      } else {
        onLogin(data);
      }
    } catch {
      setError('Connection error. Is the backend running?');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <button className="dark-toggle auth-dark-toggle" onClick={toggle} aria-label="Toggle dark mode">
        {dark ? '☀️' : '🌙'}
      </button>
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-logo">
            <span className="logo-icon">📊</span>
            <span className="logo-text">SubTrackr</span>
          </div>
          <h2 className="auth-heading">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-subheading">Track subscriptions. Kill waste. Save money.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label>Password {isSignup && <span className="label-hint">(8+ chars, 1 uppercase, 1 number)</span>}</label>
              <div className="password-wrap">
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button" className="show-pass"
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button className="link-btn" onClick={() => { setIsSignup(s => !s); setError(''); }}>
              {isSignup ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
