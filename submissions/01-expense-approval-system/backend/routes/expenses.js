const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
  routeExpense,
  routeAfterManagerApproval,
  routeAfterAdminApproval,
  getApprovalPolicy,
} = require('../services/routingEngine');

const router = express.Router();

// Configure multer for receipt file uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, GIF) and PDFs are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Helper: add an audit log entry
async function addAuditEntry(db, { expenseId, actorId, actorName, actorRole, action, comment, oldStatus, newStatus }) {
  await db('audit_log').insert({
    expense_id: expenseId,
    actor_id: actorId || null,
    actor_name: actorName || null,
    actor_role: actorRole || null,
    action,
    comment: comment || null,
    old_status: oldStatus || null,
    new_status: newStatus || null,
  });
}

// Helper: get full expense with joined actor names
async function getExpenseWithDetails(db, expenseId) {
  return db('expenses as e')
    .join('users as u', 'e.employee_id', 'u.id')
    .leftJoin('users as m', 'e.manager_id', 'm.id')
    .leftJoin('users as f', 'e.finance_admin_id', 'f.id')
    .select(
      'e.*',
      'u.name as employee_name',
      'u.email as employee_email',
      'u.department as employee_department',
      'm.name as manager_name',
      'f.name as finance_admin_name'
    )
    .where('e.id', expenseId)
    .first();
}

// ─── EMPLOYEE: Submit a new expense ─────────────────────────────────────────────

// POST /api/expenses  (multipart/form-data)
router.post('/', authenticateToken, upload.single('receipt'), async (req, res) => {
  const { title, description, amount, category } = req.body;

  if (!title || !amount || !category) {
    return res.status(400).json({ error: 'title, amount, and category are required.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  const db = getDB();
  const routing = routeExpense(parsedAmount);
  const policy = getApprovalPolicy(parsedAmount);

  try {
    const [expenseId] = await db('expenses').insert({
      employee_id: req.user.id,
      title,
      description: description || null,
      amount: parsedAmount,
      category,
      department: req.user.department,
      receipt_path: req.file ? `/uploads/${req.file.filename}` : null,
      receipt_filename: req.file ? req.file.originalname : null,
      status: routing.status,
      current_approver_role: routing.current_approver_role,
      requires_two_levels: routing.requires_two_levels,
    });

    await addAuditEntry(db, {
      expenseId,
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: `Expense submitted. Approval policy: ${policy}`,
      newStatus: routing.status,
    });

    await addAuditEntry(db, {
      expenseId,
      actorName: 'System',
      actorRole: 'system',
      action: routing.audit_action,
      oldStatus: routing.status === 'auto_approved' ? 'pending' : null,
      newStatus: routing.status,
    });

    const expense = await getExpenseWithDetails(db, expenseId);
    res.status(201).json({ expense, policy });
  } catch (err) {
    console.error('Submit expense error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── LIST EXPENSES ───────────────────────────────────────────────────────────────

// GET /api/expenses/stats/summary  — MUST be before /:id
router.get('/stats/summary', authenticateToken, requireRole('finance_admin'), async (req, res) => {
  const db = getDB();
  try {
    const rows = await db('expenses').select(
      db.raw('COUNT(*) as total'),
      db.raw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending"),
      db.raw("SUM(CASE WHEN status = 'level1_approved' THEN 1 ELSE 0 END) as level1_approved"),
      db.raw("SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved"),
      db.raw("SUM(CASE WHEN status = 'auto_approved' THEN 1 ELSE 0 END) as auto_approved"),
      db.raw("SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected"),
      db.raw("SUM(CASE WHEN status IN ('approved', 'auto_approved') THEN amount ELSE 0 END) as total_approved_amount"),
      db.raw("SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending_amount")
    );
    const stats = rows[0];

    const byDepartment = await db('expenses')
      .select('department')
      .count('id as count')
      .sum('amount as total_amount')
      .groupBy('department')
      .orderBy('total_amount', 'desc');

    res.json({ stats, byDepartment });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/expenses/pending-for-me  — MUST be before /:id
router.get('/pending-for-me', authenticateToken, requireRole('manager', 'finance_admin'), async (req, res) => {
  const db = getDB();
  try {
    const expenses = await db('expenses as e')
      .join('users as u', 'e.employee_id', 'u.id')
      .select(
        'e.*',
        'u.name as employee_name',
        'u.email as employee_email',
        'u.department as employee_department'
      )
      .where('e.current_approver_role', req.user.role)
      .orderBy('e.created_at', 'asc');
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/expenses  — list with optional filters
router.get('/', authenticateToken, async (req, res) => {
  const db = getDB();
  const { status, department } = req.query;

  try {
    let query = db('expenses as e')
      .join('users as u', 'e.employee_id', 'u.id')
      .leftJoin('users as m', 'e.manager_id', 'm.id')
      .leftJoin('users as f', 'e.finance_admin_id', 'f.id')
      .select(
        'e.*',
        'u.name as employee_name',
        'u.email as employee_email',
        'u.department as employee_department',
        'm.name as manager_name',
        'f.name as finance_admin_name'
      )
      .orderBy('e.created_at', 'desc');

    if (req.user.role === 'employee') {
      query = query.where('e.employee_id', req.user.id);
    }
    if (status) query = query.where('e.status', status);
    if (department && req.user.role !== 'employee') {
      query = query.where('e.department', department);
    }

    const expenses = await query;
    res.json(expenses);
  } catch (err) {
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/expenses/:id/audit  — full audit trail (MUST be before /:id)
router.get('/:id/audit', authenticateToken, async (req, res) => {
  const db = getDB();
  try {
    const expense = await db('expenses').where('id', req.params.id).first();
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    if (req.user.role === 'employee' && expense.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const auditLog = await db('audit_log')
      .where('expense_id', req.params.id)
      .orderBy('created_at', 'asc');
    res.json(auditLog);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/expenses/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const db = getDB();
  try {
    const expense = await getExpenseWithDetails(db, req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    if (req.user.role === 'employee' && expense.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const auditLog = await db('audit_log')
      .where('expense_id', req.params.id)
      .orderBy('created_at', 'asc');

    res.json({ expense, auditLog });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── APPROVE ─────────────────────────────────────────────────────────────────────

// POST /api/expenses/:id/approve
router.post('/:id/approve', authenticateToken, requireRole('manager', 'finance_admin'), async (req, res) => {
  const { comment } = req.body;
  const db = getDB();

  try {
    const expense = await db('expenses').where('id', req.params.id).first();
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    if (expense.current_approver_role !== req.user.role) {
      return res.status(403).json({
        error: `This expense is currently awaiting approval from: ${expense.current_approver_role || 'nobody'}.`,
      });
    }

    if (!['pending', 'level1_approved'].includes(expense.status)) {
      return res.status(400).json({ error: `Cannot approve an expense with status: ${expense.status}.` });
    }

    let nextRouting;
    if (req.user.role === 'manager') {
      nextRouting = routeAfterManagerApproval(expense);
    } else {
      nextRouting = routeAfterAdminApproval();
    }

    const oldStatus = expense.status;
    const updateData = {
      status: nextRouting.status,
      current_approver_role: nextRouting.current_approver_role,
      updated_at: new Date().toISOString(),
    };

    if (req.user.role === 'manager') {
      updateData.manager_id = req.user.id;
      if (comment) updateData.manager_comment = comment;
    } else {
      updateData.finance_admin_id = req.user.id;
      if (comment) updateData.finance_comment = comment;
    }

    await db('expenses').where('id', expense.id).update(updateData);

    await addAuditEntry(db, {
      expenseId: expense.id,
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: nextRouting.audit_action,
      comment: comment || null,
      oldStatus,
      newStatus: nextRouting.status,
    });

    const updated = await getExpenseWithDetails(db, expense.id);
    res.json(updated);
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/expenses/:id/reject
router.post('/:id/reject', authenticateToken, requireRole('manager', 'finance_admin'), async (req, res) => {
  const { comment } = req.body;
  const db = getDB();

  try {
    const expense = await db('expenses').where('id', req.params.id).first();
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    if (expense.current_approver_role !== req.user.role) {
      return res.status(403).json({
        error: `This expense is currently awaiting approval from: ${expense.current_approver_role || 'nobody'}.`,
      });
    }

    if (!['pending', 'level1_approved'].includes(expense.status)) {
      return res.status(400).json({ error: `Cannot reject an expense with status: ${expense.status}.` });
    }

    const oldStatus = expense.status;
    const updateData = {
      status: 'rejected',
      current_approver_role: null,
      updated_at: new Date().toISOString(),
    };

    if (req.user.role === 'manager') {
      updateData.manager_id = req.user.id;
      if (comment) updateData.manager_comment = comment;
    } else {
      updateData.finance_admin_id = req.user.id;
      if (comment) updateData.finance_comment = comment;
    }

    await db('expenses').where('id', expense.id).update(updateData);

    await addAuditEntry(db, {
      expenseId: expense.id,
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: `Expense rejected by ${req.user.role === 'manager' ? 'Manager' : 'Finance Admin'}.`,
      comment: comment || null,
      oldStatus,
      newStatus: 'rejected',
    });

    const updated = await getExpenseWithDetails(db, expense.id);
    res.json(updated);
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
