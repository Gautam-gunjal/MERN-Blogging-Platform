import React, { useState } from 'react';
import axios from 'axios';
import '../styles/Login.css';
import { Link, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API || '/api';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email';
    if (!password) return 'Password is required';
    return '';
  };

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const v = validate();
    if (v) return setErr(v);

    try {
      setLoading(true);
      const res = await axios.post(`${API}/auth/login`, { email: email.trim().toLowerCase(), password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Admin users should be redirected to the admin dashboard.
      if (res.data.user && res.data.user.role === 'admin') {
        nav('/admin');
      } else {
        nav('/home');
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth auth-login">
      <form onSubmit={submit} className="auth-form card" noValidate>
        <h2 className="brand">Welcome back</h2>

        {err && <div className="feedback err" role="alert">{err}</div>}

        <label className="field">
          <span className="label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span className="label">Password</span>
          <div className="pw-row">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (err) setErr(''); }}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPassword(s => !s)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <button className="submit" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="foot">
          <p>
            Don’t have an account? <Link to="/register" className="link">Create one</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
