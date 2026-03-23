import { useState } from 'react';
import api from '../api/client';

const CATEGORIES = [
  'Travel', 'Meals & Entertainment', 'Office Supplies', 'Software & Subscriptions',
  'Training & Education', 'Equipment', 'Marketing', 'Utilities', 'Other',
];

const POLICY_TIERS = [
  { label: 'Under $100', description: 'Auto-approved immediately — no review required', color: 'var(--success)' },
  { label: '$100 – $999.99', description: 'Requires Manager approval (1 level)', color: 'var(--warning)' },
  { label: '$1,000+', description: 'Requires Manager + Finance Admin approval (2 levels)', color: 'var(--danger)' },
];

export default function ExpenseForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: '',
  });
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const amount = parseFloat(formData.amount) || 0;
  const policyTier =
    amount > 0
      ? amount < 100
        ? POLICY_TIERS[0]
        : amount < 1000
        ? POLICY_TIERS[1]
        : POLICY_TIERS[2]
      : null;

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFileChange(e) {
    setReceipt(e.target.files[0] || null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!formData.title.trim()) return setError('Title is required.');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return setError('Amount must be a positive number.');
    if (!formData.category) return setError('Please select a category.');

    const data = new FormData();
    data.append('title', formData.title.trim());
    data.append('description', formData.description.trim());
    data.append('amount', formData.amount);
    data.append('category', formData.category);
    if (receipt) data.append('receipt', receipt);

    setLoading(true);
    try {
      const res = await api.post('/expenses', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(res.data);
      setFormData({ title: '', description: '', amount: '', category: '' });
      setReceipt(null);
      onSubmit?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit expense.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Policy info */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {POLICY_TIERS.map((tier) => (
          <div
            key={tier.label}
            style={{
              flex: '1 1 150px', padding: '10px 14px', borderRadius: 'var(--radius)',
              border: `1px solid ${tier.color}22`, background: `${tier.color}0d`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: tier.color }}>{tier.label}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{tier.description}</div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">
          ✅ Expense submitted! Policy applied: <strong>{success.policy}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            Expense Title <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="text"
            name="title"
            className="form-input"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Business flight to NYC"
            maxLength={200}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Amount (USD) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="number"
              name="amount"
              className="form-input"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              min="0.01"
              step="0.01"
            />
            {policyTier && (
              <div className="form-hint" style={{ color: policyTier.color, fontWeight: 500 }}>
                → {policyTier.description}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Category <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              name="category"
              className="form-select"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            name="description"
            className="form-textarea"
            value={formData.description}
            onChange={handleChange}
            placeholder="Optional details about this expense..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Receipt (Image or PDF, max 5 MB)</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              className="file-input"
              accept=".jpg,.jpeg,.png,.gif,.pdf"
              onChange={handleFileChange}
            />
            <div className="file-input-label">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {receipt ? receipt.name : 'Click to attach receipt…'}
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? <><span className="spinner" /> Submitting…</> : 'Submit Expense Claim'}
        </button>
      </form>
    </div>
  );
}
