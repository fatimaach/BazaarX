require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const productRoutes = require('./routes/product.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/products', productRoutes);

const port = process.env.PORT || 3000;

initDb()
  .then(() => {
    console.log('Database connected successfully');
    console.log('public.tenants table initialized');

    app.listen(port, () => {
      console.log(`BazaarX server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to init database:', error);
    process.exit(1);
  });
