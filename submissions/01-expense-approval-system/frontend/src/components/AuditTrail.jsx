import StatusBadge from './StatusBadge';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function AuditTrail({ auditLog, expense }) {
  if (!auditLog || auditLog.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '24px 0' }}>
        <p>No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div>
      {expense && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <strong>Current Status:</strong>&nbsp;
          <StatusBadge status={expense.status} />
          {expense.current_approver_role && (
            <span style={{ marginLeft: 8, fontSize: 12 }}>
              Waiting for: <strong style={{ textTransform: 'capitalize' }}>{expense.current_approver_role.replace('_', ' ')}</strong>
            </span>
          )}
        </div>
      )}
      <div className="audit-timeline">
        {auditLog.map((entry, i) => (
          <div key={entry.id || i} className="audit-entry">
            <div className="audit-dot" />
            <div className="audit-entry-header">
              <span className="audit-entry-actor">
                {entry.actor_name || 'System'}
              </span>
              {entry.actor_role && entry.actor_role !== 'system' && (
                <span className={`badge badge-${entry.actor_role}`} style={{ fontSize: 10 }}>
                  {entry.actor_role.replace('_', ' ')}
                </span>
              )}
              <span className="audit-entry-time">{formatDate(entry.created_at)}</span>
            </div>
            <div className="audit-entry-action">{entry.action}</div>
            {entry.old_status && entry.new_status && entry.old_status !== entry.new_status && (
              <div className="audit-status-change">
                <StatusBadge status={entry.old_status} />
                <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>→</span>
                <StatusBadge status={entry.new_status} />
              </div>
            )}
            {entry.comment && (
              <div className="audit-entry-comment">
                <strong>Comment:</strong> {entry.comment}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
