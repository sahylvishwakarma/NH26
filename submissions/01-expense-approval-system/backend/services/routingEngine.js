/**
 * Rule-Based Routing Engine
 *
 * Routing rules:
 *   amount < $100        → auto_approved (no human review needed)
 *   $100 ≤ amount < $1000 → pending → manager approves → approved/rejected
 *   amount ≥ $1000       → pending → manager approves → level1_approved → finance_admin approves → approved/rejected
 */

const THRESHOLDS = {
  AUTO_APPROVE: 100,
  TWO_LEVEL: 1000,
};

/**
 * Determine initial routing for a new expense submission.
 * @param {number} amount - The expense amount in USD
 * @returns {{ status, current_approver_role, requires_two_levels, audit_action }}
 */
function routeExpense(amount) {
  if (amount < THRESHOLDS.AUTO_APPROVE) {
    return {
      status: 'auto_approved',
      current_approver_role: null,
      requires_two_levels: 0,
      audit_action: `Auto-approved: amount $${amount.toFixed(2)} is under $${THRESHOLDS.AUTO_APPROVE} threshold`,
    };
  }

  if (amount < THRESHOLDS.TWO_LEVEL) {
    return {
      status: 'pending',
      current_approver_role: 'manager',
      requires_two_levels: 0,
      audit_action: `Routed to Manager for approval: amount $${amount.toFixed(2)} requires single-level review`,
    };
  }

  return {
    status: 'pending',
    current_approver_role: 'manager',
    requires_two_levels: 1,
    audit_action: `Routed to Manager (Level 1) for approval: amount $${amount.toFixed(2)} requires two-level review`,
  };
}

/**
 * Determine the next step after a manager approves an expense.
 * @param {object} expense - The expense record
 * @returns {{ status, current_approver_role, audit_action }}
 */
function routeAfterManagerApproval(expense) {
  if (expense.requires_two_levels) {
    return {
      status: 'level1_approved',
      current_approver_role: 'finance_admin',
      audit_action: 'Manager approved (Level 1). Escalated to Finance Admin for final approval.',
    };
  }
  return {
    status: 'approved',
    current_approver_role: null,
    audit_action: 'Manager approved. Expense fully approved.',
  };
}

/**
 * Determine the next step after a finance admin approves an expense.
 * @returns {{ status, current_approver_role, audit_action }}
 */
function routeAfterAdminApproval() {
  return {
    status: 'approved',
    current_approver_role: null,
    audit_action: 'Finance Admin approved. Expense fully approved.',
  };
}

/**
 * Get a human-readable description of the approval policy for an amount.
 * @param {number} amount
 * @returns {string}
 */
function getApprovalPolicy(amount) {
  if (amount < THRESHOLDS.AUTO_APPROVE) {
    return `Auto-approved (under $${THRESHOLDS.AUTO_APPROVE})`;
  }
  if (amount < THRESHOLDS.TWO_LEVEL) {
    return `Requires single manager approval ($${THRESHOLDS.AUTO_APPROVE}–$${THRESHOLDS.TWO_LEVEL - 0.01})`;
  }
  return `Requires two-level approval: Manager + Finance Admin (over $${THRESHOLDS.TWO_LEVEL})`;
}

module.exports = {
  routeExpense,
  routeAfterManagerApproval,
  routeAfterAdminApproval,
  getApprovalPolicy,
  THRESHOLDS,
};
