module.exports = function roleMiddleware(allowedRoles = []) {
  const roles = allowedRoles.map((role) => role.toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return next();
  };
};
