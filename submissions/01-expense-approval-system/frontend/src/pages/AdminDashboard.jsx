import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ExpenseCard from '../components/ExpenseCard';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'level1_approved', label: 'Awaiting Finance' },
  { key: 'approved', label: 'Approved' },
  { key: 'auto_approved', label: 'Auto-Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [pendingForMe, setPendingForMe] = useState([]);
  const [stats, setStats] = useState(null);
  const [byDepartment, setByDepartment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('level1_approved');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expensesRes, pendingRes, statsRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/pending-for-me'),
        api.get('/expenses/stats/summary'),
      ]);
      setExpenses(expensesRes.data);
      setPendingForMe(pendingRes.data);
      setStats(statsRes.data.stats);
      setByDepartment(statsRes.data.byDepartment);
    } catch {
      setExpenses([]);
      setPendingForMe([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredExpenses =
    tab === 'all'
      ? expenses
      : tab === 'pending-for-me'
      ? pendingForMe
      : expenses.filter((e) => e.status === tab);

  return (
    <div className="app-layout">
      <Navbar />
      <div className="main-content">
        <div className="page-header">
          <h1>Finance Admin Dashboard</h1>
          <p>Organization-wide expense oversight and final approvals, {user?.name}.</p>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Claims</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {stats.pending}
              </div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--info)' }}>
                {pendingForMe.length}
              </div>
              <div className="stat-label">Awaiting My Approval</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {(stats.approved || 0) + (stats.auto_approved || 0)}
              </div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {stats.rejected}
              </div>
              <div className="stat-label">Rejected</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 16, color: 'var(--success)' }}>
                {formatCurrency(stats.total_approved_amount || 0)}
              </div>
              <div className="stat-label">Total Approved</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 16, color: 'var(--warning)' }}>
                {formatCurrency(stats.total_pending_amount || 0)}
              </div>
              <div className="stat-label">Pending Amount</div>
            </div>
          </div>
        )}

        {pendingForMe.length > 0 && (
          <div className="alert alert-warning">
            <strong>⚠️ Action Required:</strong> You have {pendingForMe.length} expense{pendingForMe.length > 1 ? 's' : ''} requiring your final approval.
          </div>
        )}

        {/* Department breakdown */}
        {byDepartment.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Spending by Department</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Claims</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDepartment.map((row) => (
                      <tr key={row.department}>
                        <td style={{ fontWeight: 500 }}>{row.department}</td>
                        <td>{row.count}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(row.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* All expenses */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Expense Requests</span>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>↻ Refresh</button>
          </div>
          <div className="card-body">
            <div className="tabs" style={{ flexWrap: 'wrap' }}>
              <button
                className={`tab-btn${tab === 'pending-for-me' ? ' active' : ''}`}
                onClick={() => setTab('pending-for-me')}
              >
                Needs My Approval ({pendingForMe.length})
              </button>
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
                <div className="spinner" /> Loading…
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No expenses in this category.</p>
              </div>
            ) : (
              <div className="expense-list">
                {filteredExpenses.map((e) => (
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
