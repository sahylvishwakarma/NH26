import { useState } from 'react';
import api from '../api/client';
import AuditTrail from './AuditTrail';
import StatusBadge from './StatusBadge';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ExpenseCard({ expense, onAction, showActions = false, role }) {
  const [expanded, setExpanded] = useState(false);
  const [auditLog, setAuditLog] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  async function loadAudit() {
    if (auditLog) return;
    setLoadingAudit(true);
    try {
      const res = await api.get(`/expenses/${expense.id}/audit`);
      setAuditLog(res.data);
    } catch {
      setAuditLog([]);
    } finally {
      setLoadingAudit(false);
    }
  }

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadAudit();
  }

  async function handleApprove() {
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/expenses/${expense.id}/approve`, { comment: comment || undefined });
      onAction?.();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to approve.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!comment.trim()) {
      setActionError('A comment is required when rejecting an expense.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/expenses/${expense.id}/reject`, { comment });
      setShowRejectModal(false);
      onAction?.();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to reject.');
    } finally {
      setActionLoading(false);
    }
  }

  const canAct =
    showActions &&
    expense.current_approver_role === role &&
    ['pending', 'level1_approved'].includes(expense.status);

  return (
    <>
      <div className="expense-card">
        <div className="expense-card-header">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div className="expense-card-title">{expense.title}</div>
              <StatusBadge status={expense.status} />
              {expense.requires_two_levels ? (
                <span className="badge" style={{ background: '#fdf4ff', color: '#6b21a8', fontSize: 10 }}>2-Level Approval</span>
              ) : null}
            </div>
            <div className="expense-card-meta">
              <span>#{expense.id}</span>
              <span>·</span>
              <span>{expense.category}</span>
              <span>·</span>
              <span>{expense.department}</span>
              {expense.employee_name && (
                <>
                  <span>·</span>
                  <span>By: {expense.employee_name}</span>
                </>
              )}
              <span>·</span>
              <span>{formatDate(expense.created_at)}</span>
            </div>
          </div>
          <div className="expense-amount">{formatCurrency(expense.amount)}</div>
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {expense.receipt_path && (
            <a
              className="receipt-link"
              href={expense.receipt_path}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {expense.receipt_filename || 'Receipt'}
            </a>
          )}

          <button className="btn btn-secondary btn-sm" onClick={handleToggle}>
            {expanded ? 'Hide Details' : 'View Details & Audit Trail'}
          </button>

          {canAct && (
            <>
              <button
                className="btn btn-success btn-sm"
                disabled={actionLoading}
                onClick={handleApprove}
              >
                {actionLoading ? <span className="spinner" /> : '✓ Approve'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={actionLoading}
                onClick={() => { setShowRejectModal(true); setActionError(''); setComment(''); }}
              >
                ✕ Reject
              </button>
            </>
          )}
        </div>

        {actionError && !showRejectModal && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {actionError}
          </div>
        )}

        {expanded && (
          <div className="expense-card-body">
            {expense.description && (
              <p className="expense-desc">{expense.description}</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {expense.manager_name && (
                <div>
                  <div className="text-sm text-muted">Manager Review</div>
                  <div style={{ fontWeight: 500 }}>{expense.manager_name}</div>
                  {expense.manager_comment && (
                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>"{expense.manager_comment}"</div>
                  )}
                </div>
              )}
              {expense.finance_admin_name && (
                <div>
                  <div className="text-sm text-muted">Finance Admin Review</div>
                  <div style={{ fontWeight: 500 }}>{expense.finance_admin_name}</div>
                  {expense.finance_comment && (
                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>"{expense.finance_comment}"</div>
                  )}
                </div>
              )}
            </div>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Audit Trail</div>
            {loadingAudit ? (
              <div className="loading-full" style={{ minHeight: 80 }}>
                <div className="spinner" /> Loading...
              </div>
            ) : (
              <AuditTrail auditLog={auditLog} expense={expense} />
            )}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Reject Expense — {expense.title}</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
                Please provide a reason for rejection. This will be visible to the employee.
              </p>
              {actionError && <div className="alert alert-error">{actionError}</div>}
              <div className="form-group">
                <label className="form-label">Rejection Comment <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  className="form-textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain why this expense is being rejected..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={actionLoading || !comment.trim()}
                onClick={handleReject}
              >
                {actionLoading ? <span className="spinner" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
