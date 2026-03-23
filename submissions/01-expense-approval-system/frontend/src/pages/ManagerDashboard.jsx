import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ExpenseCard from '../components/ExpenseCard';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        api.get('/expenses/pending-for-me'),
        api.get('/expenses'),
      ]);
      setPendingExpenses(pendingRes.data);
      setAllExpenses(allRes.data);
    } catch {
      setPendingExpenses([]);
      setAllExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approvedCount = allExpenses.filter((e) => ['approved', 'auto_approved', 'level1_approved'].includes(e.status)).length;
  const rejectedCount = allExpenses.filter((e) => e.status === 'rejected').length;
  const totalValue = pendingExpenses.reduce((s, e) => s + e.amount, 0);

  const displayedExpenses = tab === 'pending' ? pendingExpenses : allExpenses;

  return (
    <div className="app-layout">
      <Navbar />
      <div className="main-content">
        <div className="page-header">
          <h1>Manager Review Dashboard</h1>
          <p>Review and approve pending expense claims for your team, {user?.name}.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {pendingExpenses.length}
            </div>
            <div className="stat-label">Awaiting My Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--warning)' }}>
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
            <div className="stat-label">Pending Value</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{allExpenses.length}</div>
            <div className="stat-label">Total Visible</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>{approvedCount}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{rejectedCount}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        {pendingExpenses.length > 0 && (
          <div className="alert alert-warning">
            <strong>⚠️ Action Required:</strong> You have {pendingExpenses.length} expense{pendingExpenses.length > 1 ? 's' : ''} waiting for your review.
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <span className="card-title">Expense Requests</span>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>↻ Refresh</button>
          </div>
          <div className="card-body">
            <div className="tabs">
              <button
                className={`tab-btn${tab === 'pending' ? ' active' : ''}`}
                onClick={() => setTab('pending')}
              >
                Pending My Review ({pendingExpenses.length})
              </button>
              <button
                className={`tab-btn${tab === 'all' ? ' active' : ''}`}
                onClick={() => setTab('all')}
              >
                All Requests ({allExpenses.length})
              </button>
            </div>

            {loading ? (
              <div className="loading-full">
                <div className="spinner" /> Loading…
              </div>
            ) : displayedExpenses.length === 0 ? (
              <div className="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                  {tab === 'pending'
                    ? 'No pending expenses — all caught up! 🎉'
                    : 'No expense claims found.'}
                </p>
              </div>
            ) : (
              <div className="expense-list">
                {displayedExpenses.map((e) => (
                  <ExpenseCard
                    key={e.id}
                    expense={e}
                    role={user.role}
                    showActions
                    onAction={fetchData}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
