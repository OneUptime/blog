# How to Implement a Tenant Isolation Strategy in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Multi-Tenancy, Security, Schema, Database

Description: Learn three proven tenant isolation strategies in MySQL: separate databases, shared schema with tenant ID, and row-level security patterns.

---

## Why Tenant Isolation Matters

In SaaS applications, multiple customers (tenants) share the same infrastructure. Poor isolation can lead to data leaks between tenants, noisy-neighbor performance problems, and compliance failures. MySQL does not have built-in row-level security like PostgreSQL, so isolation must be enforced at the application and schema level.

## Strategy 1: Separate Database Per Tenant

Each tenant gets its own MySQL database (schema). This is the strongest isolation model.

```sql
-- Create a dedicated database for each tenant
CREATE DATABASE tenant_acme CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE tenant_globex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a tenant-specific user with access only to their database
CREATE USER 'acme_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON tenant_acme.* TO 'acme_user'@'%';
FLUSH PRIVILEGES;
```

Pros: complete data isolation, easy per-tenant backup and restore, independent schema migrations.
Cons: database connection overhead scales with tenant count, harder to run cross-tenant analytics.

## Strategy 2: Shared Schema with Tenant ID Column

All tenants share the same tables. Every table includes a `tenant_id` column that links rows to a tenant.

```sql
CREATE TABLE orders (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   INT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_tenant_customer (tenant_id, customer_id)
);
```

All queries must filter by `tenant_id`. Use a view or stored procedure layer to enforce this:

```sql
-- Stored procedure that always scopes queries to a tenant
DELIMITER $$
CREATE PROCEDURE get_orders(IN p_tenant_id INT UNSIGNED)
BEGIN
  SELECT id, customer_id, total, created_at
  FROM orders
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at DESC;
END$$
DELIMITER ;
```

For extra safety, create a per-tenant view that hard-codes `tenant_id`:

```sql
-- Application connects as tenant_acme_user, which only sees this view
CREATE VIEW acme_orders AS
  SELECT id, customer_id, total, created_at
  FROM orders
  WHERE tenant_id = 1001;
```

## Strategy 3: Separate Schemas in the Same MySQL Instance

A middle ground: each tenant has their own schema (MySQL calls schemas and databases the same thing), but they all run in the same MySQL instance. This provides logical isolation without multiplying server processes.

```bash
# Automate schema provisioning with a shell script
TENANT=$1
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS tenant_${TENANT}
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${TENANT}_user'@'%'
  IDENTIFIED BY '$(openssl rand -base64 16)';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON tenant_${TENANT}.* TO '${TENANT}_user'@'%';
FLUSH PRIVILEGES;
EOF
```

## Enforcing Isolation at the Application Layer

Even with database-level controls, the application must pass the correct `tenant_id` and never allow tenants to supply their own `tenant_id` in requests.

```sql
-- BAD: lets a user supply their own tenant_id
SELECT * FROM orders WHERE tenant_id = ? AND id = ?;
-- Value for tenant_id comes from user input -- never do this

-- GOOD: tenant_id comes from the authenticated session only
-- In application code: tenant_id = session.tenant_id (not from request body)
SELECT * FROM orders WHERE tenant_id = ? AND id = ?;
```

## Monitoring Tenant Activity

Use the Performance Schema to track query patterns per tenant connection:

```sql
SELECT PROCESSLIST_USER, COUNT(*) AS active_connections
FROM performance_schema.threads
WHERE TYPE = 'FOREGROUND'
GROUP BY PROCESSLIST_USER
ORDER BY active_connections DESC;
```

## Summary

MySQL supports tenant isolation through separate databases, shared tables with `tenant_id` columns, or per-tenant schemas. The shared schema approach is most resource-efficient but requires strict application-level enforcement. For high-compliance workloads, separate databases offer the strongest boundary. Always index `tenant_id` columns and ensure the application never trusts user-supplied tenant identifiers.
