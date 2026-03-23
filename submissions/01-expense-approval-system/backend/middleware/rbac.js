/**
 * Role-Based Access Control (RBAC) middleware.
 * Usage: requireRole('manager', 'finance_admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. This action requires one of the following roles: ${roles.join(', ')}.`,
      });
    }
    next();
  };
}

module.exports = { requireRole };
