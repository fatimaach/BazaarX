const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByEmail,
  isValidTenantId,
  tenantExists,
  VALID_ROLES,
  countAdmins
} = require('../config/db');

const router = express.Router();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

router.post('/signup', async (req, res) => {
  const { name, email, password, role, tenantId } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role are required' });
  }

  const normalizedRole = role.toUpperCase();

  if (!VALID_ROLES.includes(normalizedRole)) {
    return res.status(400).json({ error: 'role must be ADMIN, SELLER, or CUSTOMER' });
  }

  if (normalizedRole === 'ADMIN') {
    if (tenantId) {
      if (!isValidTenantId(tenantId)) {
        return res.status(400).json({ error: 'Invalid tenantId format' });
      }

      const exists = await tenantExists(tenantId);
      if (!exists) {
        return res.status(400).json({ error: 'Tenant does not exist' });
      }
    }
  }

  if (normalizedRole === 'SELLER') {
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required for SELLER' });
    }

    if (!isValidTenantId(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenantId format' });
    }

    const exists = await tenantExists(tenantId);
    if (!exists) {
      return res.status(400).json({ error: 'Tenant does not exist' });
    }
  }

  if (normalizedRole === 'ADMIN' && !tenantId) {
    const admins = await countAdmins();
    if (admins > 0) {
      return res.status(400).json({
        error: 'ADMIN signup requires tenantId after the first admin is created'
      });
    }
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
      tenantId: tenantId || null
    });

    return res.status(201).json({ message: 'Signup successful', user });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (error.code === 'INVALID_ROLE') {
      return res.status(400).json({ error: 'Invalid role' });
    }
    console.error('Signup failed:', error);
    return res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '15m' });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
