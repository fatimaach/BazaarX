const express = require('express');
const tenantResolver = require('../middleware/tenantResolver');
const { runWithTenant } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(tenantResolver);

router.post('/', roleMiddleware(['SELLER']), async (req, res) => {
  const { name, price, stock } = req.body;
  const sellerTenantId = req.user?.tenantId;

  if (sellerTenantId && req.tenantId !== sellerTenantId) {
    return res.status(403).json({ error: 'Sellers can only add products to their own tenant' });
  }

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name and price are required' });
  }

  if (Number.isNaN(Number(price))) {
    return res.status(400).json({ error: 'price must be a number' });
  }

  if (stock !== undefined && Number.isNaN(Number(stock))) {
    return res.status(400).json({ error: 'stock must be a number' });
  }

  try {
    const product = await runWithTenant(req.tenantId, async (client) => {
      const result = await client.query(
        'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING id, name, price, stock, created_at',
        [name, price, stock || 0]
      );

      return result.rows[0];
    });

    return res.status(201).json({ product });
  } catch (error) {
    console.error('Add product failed:', error);
    return res.status(500).json({ error: 'Failed to add product' });
  }
});

router.get('/', roleMiddleware(['CUSTOMER', 'SELLER', 'ADMIN']), async (req, res) => {
  try {
    const products = await runWithTenant(req.tenantId, async (client) => {
      const result = await client.query(
        'SELECT id, name, price, stock, created_at FROM products ORDER BY id DESC'
      );

      return result.rows;
    });

    return res.json({ products });
  } catch (error) {
    console.error('List products failed:', error);
    return res.status(500).json({ error: 'Failed to list products' });
  }
});

router.delete('/:id', roleMiddleware(['ADMIN']), async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'product id must be a number' });
  }

  try {
    const deleted = await runWithTenant(req.tenantId, async (client) => {
      const result = await client.query(
        'DELETE FROM products WHERE id = $1 RETURNING id, name',
        [id]
      );

      return result.rows[0] || null;
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json({ message: 'Product deleted', product: deleted });
  } catch (error) {
    console.error('Delete product failed:', error);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
