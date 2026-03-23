const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// GET /api/users  — finance_admin can list all users; managers too
router.get('/', authenticateToken, requireRole('manager', 'finance_admin'), async (req, res) => {
  const db = getDB();
  try {
    const users = await db('users')
      .select('id', 'name', 'email', 'role', 'department', 'created_at')
      .orderBy('name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/managers  — list all managers
router.get('/managers', authenticateToken, requireRole('finance_admin'), async (req, res) => {
  const db = getDB();
  try {
    const managers = await db('users')
      .select('id', 'name', 'email', 'department')
      .where('role', 'manager')
      .orderBy('name');
    res.json(managers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/:id  — get a single user profile
router.get('/:id', authenticateToken, async (req, res) => {
  if (req.user.role === 'employee' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  const db = getDB();
  try {
    const user = await db('users')
      .select('id', 'name', 'email', 'role', 'department', 'created_at')
      .where('id', req.params.id)
      .first();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
