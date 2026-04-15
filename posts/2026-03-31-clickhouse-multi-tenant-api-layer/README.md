# How to Build a Multi-Tenant API Layer Over ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Multi-Tenant, API Design, Row Policy, Tenant Isolation

Description: Build a multi-tenant analytics API over ClickHouse using row-level policies and tenant-scoped ClickHouse users to ensure complete data isolation between customers.

---

## Multi-Tenancy Approaches in ClickHouse

There are three main strategies:
1. **Separate databases per tenant** - strong isolation, high overhead
2. **Shared tables with tenant_id column** - efficient, requires row policy enforcement
3. **Separate ClickHouse users per tenant** - middleware enforces tenant scoping

For most SaaS analytics platforms, shared tables with ClickHouse row policies is the best balance of isolation and efficiency.

## Schema with Tenant ID

```sql
CREATE TABLE events
(
    event_time DateTime,
    tenant_id UInt32,
    user_id UInt64,
    event_type LowCardinality(String),
    page_url String
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(event_time))
ORDER BY (tenant_id, event_time);
```

## Row Policies for Tenant Isolation

```sql
-- Create a ClickHouse user per tenant
CREATE USER tenant_42 IDENTIFIED WITH plaintext_password BY 'secure_password_42';

-- Row policy: tenant_42 can only see their own rows
CREATE ROW POLICY tenant_42_policy ON events
    FOR SELECT USING tenant_id = 42
    TO tenant_42;
```

With this policy in place, `SELECT * FROM events` executed as `tenant_42` automatically returns only rows where `tenant_id = 42`.

## API Layer with Tenant Context

```javascript
// middleware/tenantAuth.js
const clientPool = new Map(); // per-tenant connection pool

function getTenantClient(tenantId) {
  if (!clientPool.has(tenantId)) {
    const { createClient } = require('@clickhouse/client');
    clientPool.set(tenantId, createClient({
      url: process.env.CLICKHOUSE_HOST,
      username: `tenant_${tenantId}`,
      password: process.env[`CLICKHOUSE_PASSWORD_TENANT_${tenantId}`],
      database: 'analytics',
    }));
  }
  return clientPool.get(tenantId);
}

async function tenantMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const tenant = await resolveTenantFromKey(apiKey); // your lookup logic

  if (!tenant) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.tenantId = tenant.id;
  req.clickhouse = getTenantClient(tenant.id);
  next();
}

module.exports = { tenantMiddleware };
```

## Tenant-Safe Query Handler

```javascript
// routes/analytics.js
const { tenantMiddleware } = require('../middleware/tenantAuth');

app.get('/api/analytics/events', tenantMiddleware, async (req, res) => {
  const { start_date, end_date, limit = 100 } = req.query;

  // Note: NO explicit tenant_id filter needed in the query
  // because ClickHouse row policy enforces it automatically
  const result = await req.clickhouse.query({
    query: `
      SELECT event_type, count() AS count
      FROM events
      WHERE event_time BETWEEN {start:DateTime} AND {end:DateTime}
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { start: start_date, end: end_date, limit: parseInt(limit) },
    format: 'JSONEachRow',
  });

  res.json({ data: await result.json() });
});
```

## Fallback: Application-Level Tenant Filtering

If you can't create per-tenant ClickHouse users, enforce tenant isolation at the application level:

```javascript
// Always inject tenant_id into queries programmatically
async function queryForTenant(client, tenantId, query, params) {
  return client.query({
    query: `${query} -- tenant: ${tenantId}`,
    query_params: { ...params, tenant_id: tenantId },
    format: 'JSONEachRow',
    // Force tenant filter - NEVER trust user input for tenant_id
    clickhouse_settings: {
      additional_table_filters: { events: `tenant_id = ${parseInt(tenantId)}` },
    },
  });
}
```

## Summary

Multi-tenant ClickHouse APIs use row-level policies to automatically scope queries to each tenant's data, with per-tenant ClickHouse users that enforce these policies at the database level. The API layer resolves the tenant from the API key and routes to the correct ClickHouse user. This approach requires zero explicit tenant filtering in query logic and prevents data leakage even if application code has bugs.
