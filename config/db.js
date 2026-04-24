const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const TENANT_ID_REGEX = /^[A-Za-z0-9_]+$/;
const VALID_ROLES = ['ADMIN', 'SELLER', 'CUSTOMER'];

function isValidTenantId(tenantId) {
  return typeof tenantId === 'string' && TENANT_ID_REGEX.test(tenantId);
}

async function initDb() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        tenant_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schema_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        tenant_id TEXT REFERENCES public.tenants(tenant_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CHECK (role IN ('ADMIN', 'SELLER', 'CUSTOMER'))
      )
    `);

    const tenants = await client.query(
      'SELECT tenant_id, schema_name FROM public.tenants'
    );

    for (const tenant of tenants.rows) {
      await ensureTenantSchema(client, tenant.schema_name || tenant.tenant_id);
    }
  } finally {
    client.release();
  }
}

async function ensureTenantSchema(client, schema) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`
    ALTER TABLE IF EXISTS "${schema}".products
    ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0
  `);
}

async function createTenant(tenantId, name) {
  if (!isValidTenantId(tenantId)) {
    const error = new Error('Invalid tenantId');
    error.code = 'INVALID_TENANT_ID';
    throw error;
  }

  const schema = tenantId;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await ensureTenantSchema(client, schema);

    const insertSql = `
      INSERT INTO public.tenants (tenant_id, name, schema_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id)
      DO UPDATE SET name = EXCLUDED.name, schema_name = EXCLUDED.schema_name
    `;

    await client.query(insertSql, [tenantId, name, schema]);
    await client.query('COMMIT');

    return { tenantId, name, schema };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createUser({ name, email, password, role, tenantId }) {
  if (!VALID_ROLES.includes(role)) {
    const error = new Error('Invalid role');
    error.code = 'INVALID_ROLE';
    throw error;
  }

  const result = await pool.query(
    `
      INSERT INTO public.users (name, email, password, role, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, tenant_id
    `,
    [name, email, password, role, tenantId]
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query(
    'SELECT id, name, email, password, role, tenant_id FROM public.users WHERE email = $1',
    [email]
  );

  return result.rows[0];
}

async function tenantExists(tenantId) {
  const result = await pool.query(
    'SELECT tenant_id FROM public.tenants WHERE tenant_id = $1',
    [tenantId]
  );

  return result.rowCount > 0;
}

async function countAdmins() {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM public.users WHERE role = 'ADMIN'"
  );

  return result.rows[0]?.count || 0;
}

async function deleteTenant(tenantId) {
  if (!isValidTenantId(tenantId)) {
    const error = new Error('Invalid tenantId');
    error.code = 'INVALID_TENANT_ID';
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tenantResult = await client.query(
      'SELECT tenant_id, schema_name FROM public.tenants WHERE tenant_id = $1',
      [tenantId]
    );

    if (tenantResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const tenant = tenantResult.rows[0];
    const schemaName = tenant.schema_name || tenant.tenant_id;

    await client.query('DELETE FROM public.tenants WHERE tenant_id = $1', [tenantId]);
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

    await client.query('COMMIT');
    return { tenantId: tenant.tenant_id, schema: schemaName };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runWithTenant(tenantId, callback) {
  if (!isValidTenantId(tenantId)) {
    const error = new Error('Invalid tenantId');
    error.code = 'INVALID_TENANT_ID';
    throw error;
  }

  const schema = tenantId;
  const client = await pool.connect();

  try {
    await client.query(`SET search_path TO "${schema}", public`);
    return await callback(client);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDb,
  createTenant,
  runWithTenant,
  isValidTenantId,
  createUser,
  findUserByEmail,
  tenantExists,
  VALID_ROLES,
  countAdmins,
  deleteTenant
};
