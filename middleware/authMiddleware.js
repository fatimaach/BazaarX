const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.header('authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId || null
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
