import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const DEMO_ACCOUNTS = [
    { email: 'alice@company.com', role: 'Employee', dept: 'Engineering' },
    { email: 'carol@company.com', role: 'Manager', dept: 'Engineering' },
    { email: 'eve@company.com', role: 'Finance Admin', dept: 'Finance' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>💼 ExpenseFlow</h1>
          <p>Corporate Procurement & Expense Portal</p>
        </div>

        <h2 className="auth-title">Sign in to your account</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <hr className="divider" />
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8, textAlign: 'center' }}>
          Demo accounts (password: <strong>password123</strong>)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => setForm({ email: acc.email, password: 'password123' })}
            >
              <span style={{ flex: 1 }}>{acc.email}</span>
              <span className={`badge badge-${acc.role.toLowerCase().replace(' ', '_')}`} style={{ fontSize: 10 }}>
                {acc.role}
              </span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--gray-500)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
