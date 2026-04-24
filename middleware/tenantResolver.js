const { isValidTenantId, tenantExists } = require('../config/db');

module.exports = async function tenantResolver(req, res, next) {
  const headerTenantId = req.header('x-tenant-id');
  const tenantId = headerTenantId || req.user?.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' });
  }

  if (!isValidTenantId(tenantId)) {
    return res.status(400).json({
      error: 'Invalid tenant id. Use letters, numbers, underscores only.'
    });
  }

  try {
    const exists = await tenantExists(tenantId);
    if (!exists) {
      return res
        .status(404)
        .json({ error: 'Tenant not found. Please enter a valid tenant ID.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to validate tenant' });
  }

  req.tenantId = tenantId;
  next();
};
