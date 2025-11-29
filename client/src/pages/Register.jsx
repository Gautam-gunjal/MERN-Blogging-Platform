import React, { useMemo, useState } from 'react';
import axios from 'axios';
import '../styles/Register.css';
import { Link, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API || '/api';

function calcPasswordStrength(pw) {
  let score = 0;
  if (!pw) return 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score; // 0..4
}

export default function Register() {
  const nav = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [adminKey, setAdminKey] = useState(''); // <<< admin key (optional)
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const pwScore = useMemo(() => calcPasswordStrength(password), [password]);

  const validate = () => {
    if (!username.trim()) return 'Username is required';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email';
    if (!password) return 'Password is required';
    if (password.length < 5) return 'Password must be at least 5 characters';
    if (password !== confirm) return 'Passwords do not match';
    return '';
  };

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSuccess('');
    const v = validate();
    if (v) return setErr(v);

    try {
      setLoading(true);

      // include adminKey in payload if provided (backend should decide whether to grant admin)
      const payload = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      };
      if (adminKey && adminKey.trim()) payload.adminKey = adminKey.trim();

      const res = await axios.post(`${API}/auth/register`, payload);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      setSuccess('Account created — redirecting…');

      // if backend returned a user with role 'admin', go to admin dashboard
      const role = (res.data.user && res.data.user.role) || 'user';
      setTimeout(() => nav(role === 'admin' ? '/admin' : '/home'), 700);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Registration failed';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  const strengthLabel = ['Very weak','Weak','Okay','Strong','Excellent'][pwScore] || 'Very weak';

  return (
    <div className="auth auth-register">
      <form onSubmit={submit} className="auth-form card" noValidate>
        <h2 className="brand">Create account</h2>

        {err && <div className="feedback err" role="alert">{err}</div>}
        {success && <div className="feedback success" role="status">{success}</div>}

        <label className="field">
          <span className="label">Username</span>
          <input
            value={username}
            onChange={(e)=>{ setUsername(e.target.value); if(err) setErr(''); }}
            placeholder="Choose a display name"
            name="username"
            autoComplete="username"
            required
            aria-required="true"
          />
        </label>

        <label className="field">
          <span className="label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e)=>{ setEmail(e.target.value); if(err) setErr(''); }}
            placeholder="you@example.com"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
          />
        </label>

        <label className="field">
          <span className="label">Password</span>
          <div className="pw-row">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e)=>{ setPassword(e.target.value); if(err) setErr(''); }}
              placeholder="At least 6 characters"
              name="password"
              autoComplete="new-password"
              minLength={5}
              required
              aria-required="true"
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

          <div className="pw-strength">
            <div className={`bar s-${pwScore}`} style={{ '--score': pwScore }} />
            <div className="pw-meta">
              <small className="muted">Strength: {strengthLabel}</small>
              <small className="muted"> {password.length ? ` • ${password.length} chars` : ''}</small>
            </div>
          </div>
        </label>

        <label className="field">
          <span className="label">Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e)=>{ setConfirm(e.target.value); if(err) setErr(''); }}
            placeholder="Re-type your password"
            name="confirm"
            autoComplete="new-password"
            required
            aria-required="true"
          />
        </label>

        {/* ADMIN: optional admin key field.
            Backend must validate adminKey and assign role='admin' when valid.
            This input is intentionally optional and won't affect normal user registration. */}
        <label className="field">
          <span className="label">Admin key (optional)</span>
          <input
            value={adminKey}
            onChange={(e)=>{ setAdminKey(e.target.value); if(err) setErr(''); }}
            placeholder="Enter admin key if registering as admin"
            name="adminKey"
            autoComplete="off"
            aria-label="Admin key (optional)"
          />
          <small className="muted">Only provide a key if you should be an admin.</small>
        </label>

        <button className="submit" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <div className="foot">
          <p>Already have an account? <Link to="/login" className="link">Sign in</Link></p>
        </div>
      </form>
    </div>
  );
}
