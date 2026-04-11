# How to Use MySQL for Multi-Tenant Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Multi-Tenant, Schema, Isolation, Architecture

Description: Learn three MySQL multi-tenancy strategies - shared tables, separate schemas, and separate databases - and how to choose and implement the right one for your application.

---

Multi-tenancy is the ability for a single application instance to serve multiple customers (tenants) while keeping their data isolated. MySQL supports three multi-tenancy strategies, each with different trade-offs for isolation, operational complexity, and scalability.

## Strategy 1: Shared Tables with Tenant ID

All tenants share the same tables. Every table has a `tenant_id` column, and every query filters by it:

```sql
CREATE TABLE tenants (
  id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug   VARCHAR(100) NOT NULL,
  name   VARCHAR(200) NOT NULL,
  UNIQUE KEY uq_slug (slug)
);

CREATE TABLE orders (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  status      VARCHAR(50) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_status (tenant_id, status),
  CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);
```

Every query must include the `tenant_id` filter:

```sql
SELECT * FROM orders WHERE tenant_id = 7 AND status = 'pending';
```

Use Row-Level Security in the application layer - never trust `tenant_id` from user input:

```python
def get_orders(db, tenant_id, status):
    return db.execute(
        "SELECT id, total, status FROM orders WHERE tenant_id = %s AND status = %s",
        (tenant_id, status)
    ).fetchall()
```

## Strategy 2: Separate Schema per Tenant

Each tenant gets its own MySQL schema (database) on the same server:

```sql
-- Create schema for a new tenant
CREATE DATABASE tenant_acme CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create schema for another tenant
CREATE DATABASE tenant_beta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Apply schema migrations to each tenant database
USE tenant_acme;
SOURCE /migrations/V1__create_orders.sql;
```

Connecting to the right schema per request:

```python
def get_db_for_tenant(tenant_slug):
    return create_engine(
        f"mysql+pymysql://app_user:pass@db-host/tenant_{tenant_slug}"
    )
```

## Strategy 3: Separate Database Server per Tenant

For the highest isolation, each tenant gets a dedicated MySQL instance. This is practical with containerization:

```yaml
# docker-compose.yml snippet for tenant-specific MySQL
services:
  mysql-acme:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: acme_root_pass
      MYSQL_DATABASE: acme
      MYSQL_USER: acme_user
      MYSQL_PASSWORD: acme_pass
    volumes:
      - acme-data:/var/lib/mysql
```

## Choosing a Strategy

```text
Strategy              | Isolation | Ops Complexity | Tenants/Server
Shared tables         | Low       | Low            | Unlimited
Separate schema       | Medium    | Medium         | ~100-500
Separate server       | High      | High           | 1
```

Shared tables work for SaaS products with thousands of tenants and low per-tenant data volumes. Separate schemas suit compliance-sensitive products where tenants need guaranteed data separation. Separate servers are for enterprise customers requiring complete isolation.

## Preventing Cross-Tenant Data Leaks

With shared tables, enforce `tenant_id` at the ORM or middleware level:

```python
class TenantScopedQuery:
    def __init__(self, db, tenant_id):
        self.db = db
        self.tenant_id = tenant_id

    def find_orders(self, status=None):
        sql = "SELECT * FROM orders WHERE tenant_id = %s"
        params = [self.tenant_id]
        if status:
            sql += " AND status = %s"
            params.append(status)
        return self.db.execute(sql, params).fetchall()
```

## Summary

MySQL multi-tenancy strategy depends on your isolation requirements and scale. Shared tables with `tenant_id` columns support the most tenants per server with the simplest operations. Separate schemas provide stronger isolation with moderate complexity. Separate servers maximize isolation but require container orchestration or cloud automation. Regardless of strategy, enforce tenant scoping at the application layer to prevent cross-tenant data leaks.
