import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseCard from '../components/ExpenseCard';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'level1_approved', label: 'In Progress' },
  { key: 'approved', label: 'Approved' },
  { key: 'auto_approved', label: 'Auto-Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab !== 'all' ? { status: tab } : {};
      const res = await api.get('/expenses', { params });
      setExpenses(res.data);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const counts = expenses.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const approvedAmount = expenses
    .filter((e) => ['approved', 'auto_approved'].includes(e.status))
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="app-layout">
      <Navbar />
      <div className="main-content">
        <div className="page-header">
          <h1>My Expense Claims</h1>
          <p>Submit and track your corporate expense requests, {user?.name}.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{expenses.length}</div>
            <div className="stat-label">Total Claims</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {(counts.pending || 0) + (counts.level1_approved || 0)}
            </div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {(counts.approved || 0) + (counts.auto_approved || 0)}
            </div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              {counts.rejected || 0}
            </div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 18 }}>
              ${approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-label">Approved Amount</div>
          </div>
        </div>

        {/* Submit new claim */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            className="card-header"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowForm((v) => !v)}
          >
            <span className="card-title">➕ Submit New Expense Claim</span>
            <button className="btn btn-primary btn-sm" type="button">
              {showForm ? 'Cancel' : 'New Claim'}
            </button>
          </div>
          {showForm && (
            <div className="card-body">
              <ExpenseForm
                onSubmit={() => {
                  setShowForm(false);
                  setTab('all');
                  fetchExpenses();
                }}
              />
            </div>
          )}
        </div>

        {/* Expense list */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Expense History</span>
          </div>
          <div className="card-body">
            <div className="tabs">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  className={`tab-btn${tab === t.key ? ' active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="loading-full">
                <div className="spinner" /> Loading expenses…
              </div>
            ) : expenses.length === 0 ? (
              <div className="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
                <p>No expense claims found.</p>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => setShowForm(true)}
                >
                  Submit your first claim
                </button>
              </div>
            ) : (
              <div className="expense-list">
                {expenses.map((e) => (
                  <ExpenseCard key={e.id} expense={e} role={user.role} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
