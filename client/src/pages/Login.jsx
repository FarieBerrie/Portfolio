import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, auth } from '../api.js';
import { HeroBackdrop } from '../components/Graphics.jsx';
import Reveal from '../components/Reveal.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await api('/auth/login', { method: 'POST', body: form });
      auth.set(token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="center-screen backdrop-screen ink">
      <HeroBackdrop />
      <Reveal as="form" className="card form login" variant="scale" onSubmit={submit}>
        <h1>Admin sign in</h1>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>
        {error && <p className="notice error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <Link to="/" className="muted small-text">
          ← Back to site
        </Link>
      </Reveal>
    </div>
  );
}
