const STATUS_CONFIG = {
  pending: { label: 'Pending Review', className: 'badge-pending' },
  level1_approved: { label: 'Mgr Approved / Awaiting Finance', className: 'badge-level1_approved' },
  approved: { label: 'Approved', className: 'badge-approved' },
  auto_approved: { label: 'Auto-Approved', className: 'badge-auto_approved' },
  rejected: { label: 'Rejected', className: 'badge-rejected' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: '' };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
