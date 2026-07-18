// Middleware to protect admin-only API routes.
// Checks for an active logged-in session set during /api/auth/login.
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please log in as admin.' });
}

module.exports = { requireAdmin };
