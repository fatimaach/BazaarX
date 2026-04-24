const express = require('express');
const { createTenant, isValidTenantId, deleteTenant } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { tenantId, name } = req.body;

  if (!tenantId || !name) {
    return res.status(400).json({ error: 'tenantId and name are required' });
  }

  if (!isValidTenantId(tenantId)) {
    return res.status(400).json({
      error: 'tenantId must be letters, numbers, underscores only'
    });
  }

  try {
    const tenant = await createTenant(tenantId, name);
    return res.status(201).json({ message: 'Tenant ready', tenant });
  } catch (error) {
    console.error('Create tenant failed:', error);
    return res.status(500).json({ error: 'Failed to create tenant' });
  }
});

router.delete('/:tenantId', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { tenantId } = req.params;

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  if (!isValidTenantId(tenantId)) {
    return res.status(400).json({
      error: 'tenantId must be letters, numbers, underscores only'
    });
  }

  try {
    const deleted = await deleteTenant(tenantId);

    if (!deleted) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    return res.json({ message: 'Tenant deleted', tenant: deleted });
  } catch (error) {
    console.error('Delete tenant failed:', error);
    return res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

module.exports = router;
