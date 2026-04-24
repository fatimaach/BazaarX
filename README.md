# BazaarX – Multi-Tenant SaaS Marketplace

BazaarX is a multi-tenant marketplace API where each tenant has its own schema inside a shared PostgreSQL database.

## Tech stack

- Node.js
- Express
- PostgreSQL
- pg
- dotenv

## Database model

- Shared database
- Separate schema per tenant

## Create the database in pgAdmin

1. Open pgAdmin and connect to your PostgreSQL server.
2. Right-click Databases and choose Create > Database.
3. Set the database name to `bazaarx_db`.
4. Click Save.

## Run the project

1. Install dependencies:

```bash
npm install
```

2. Update the `.env` file to replace `YOUR_PASSWORD` with your PostgreSQL password.
3. Start the server:

```bash
npm run dev
```

## Postman testing APIs

### Create tenant

POST http://localhost:5000/api/tenants

Body:
```json
{
  "name": "Electronics Store",
  "tenantId": "electronics"
}
```

### Add product

POST http://localhost:5000/api/products

Header:
```
x-tenant-id: electronics
```

Body:
```json
{
  "name": "iPhone 15",
  "price": 250000,
  "stock": 10
}
```

### Get products

GET http://localhost:5000/api/products

Header:
```
x-tenant-id: electronics
```
