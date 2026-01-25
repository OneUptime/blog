# How to Design Multi-Tenant Schemas in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Multi-Tenancy, SaaS, Database Design, Architecture

Description: Learn the three main approaches to multi-tenant database design in PostgreSQL - shared tables, separate schemas, and separate databases - with practical implementation patterns and trade-offs for each approach.

---

Every SaaS application faces the same question: how do you store data for multiple customers in one database? The answer affects security, performance, operational complexity, and how you scale. This guide covers the three main approaches with practical PostgreSQL implementations.

## The Three Approaches

### 1. Shared Tables (Pool Model)

All tenants share the same tables with a `tenant_id` column.

```
┌─────────────────────────────────────┐
│           users table               │
├─────────────────────────────────────┤
│ id │ tenant_id │ name    │ email   │
├────┼───────────┼─────────┼─────────┤
│ 1  │ acme      │ Alice   │ a@...   │
│ 2  │ acme      │ Bob     │ b@...   │
│ 3  │ globex    │ Carol   │ c@...   │
└─────────────────────────────────────┘
```

### 2. Separate Schemas (Bridge Model)

Each tenant gets their own PostgreSQL schema within a shared database.

```
┌─────────────────────────────────────┐
│           Database: saas            │
├─────────────────────────────────────┤
│ Schema: acme     │ Schema: globex   │
│  └─ users        │  └─ users        │
│  └─ orders       │  └─ orders       │
│  └─ products     │  └─ products     │
└─────────────────────────────────────┘
```

### 3. Separate Databases (Silo Model)

Each tenant gets their own PostgreSQL database.

```
┌────────────────┐  ┌────────────────┐
│ Database: acme │  │ Database:globex│
│  └─ users      │  │  └─ users      │
│  └─ orders     │  │  └─ orders     │
└────────────────┘  └────────────────┘
```

## Approach 1: Shared Tables

### Implementation

```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create tables with tenant_id
CREATE TABLE tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(tenant_id, email)  -- Email unique per tenant
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- Create indexes including tenant_id
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_tenant_user ON orders(tenant_id, user_id);
```

### Row Level Security

RLS ensures tenants can only see their own data:

```sql
-- Create application role
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- RLS policy for users table
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant'))
    WITH CHECK (tenant_id = current_setting('app.current_tenant'));

-- RLS policy for orders table
CREATE POLICY tenant_isolation_orders ON orders
    USING (tenant_id = current_setting('app.current_tenant'))
    WITH CHECK (tenant_id = current_setting('app.current_tenant'));
```

### Application Usage

Set the tenant context at the start of each request:

```sql
-- Set tenant context (do this at the start of each request)
SET app.current_tenant = 'acme';

-- Now all queries are automatically filtered
SELECT * FROM users;  -- Only returns acme users
INSERT INTO users (tenant_id, name, email)
VALUES ('acme', 'Dave', 'dave@example.com');  -- Works

INSERT INTO users (tenant_id, name, email)
VALUES ('globex', 'Eve', 'eve@example.com');  -- Fails: RLS violation
```

In your application code (Python example):

```python
from contextlib import contextmanager

@contextmanager
def tenant_context(conn, tenant_id):
    """Set tenant context for the connection."""
    cursor = conn.cursor()
    # Set the tenant for this session
    cursor.execute("SET app.current_tenant = %s", (tenant_id,))
    try:
        yield cursor
    finally:
        # Reset tenant context
        cursor.execute("RESET app.current_tenant")

# Usage
with tenant_context(conn, 'acme') as cursor:
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()  # Only acme users
```

### Pros and Cons

**Pros:**
- Simple deployment and maintenance
- Easy cross-tenant queries and analytics
- Efficient connection pooling
- No schema migration complexity

**Cons:**
- Noisy neighbor risk (one tenant's queries affect others)
- RLS overhead on every query
- Harder to offer tenant-specific customizations
- Single point of failure

## Approach 2: Separate Schemas

### Implementation

```sql
-- Function to create a new tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_name TEXT) RETURNS VOID AS $$
BEGIN
    -- Create schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', tenant_name);

    -- Create tables in the schema
    EXECUTE format('
        CREATE TABLE %I.users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT now()
        )', tenant_name);

    EXECUTE format('
        CREATE TABLE %I.orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES %I.users(id),
            amount NUMERIC(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT now()
        )', tenant_name, tenant_name);

    -- Create indexes
    EXECUTE format('CREATE INDEX ON %I.users(email)', tenant_name);
    EXECUTE format('CREATE INDEX ON %I.orders(user_id)', tenant_name);
END;
$$ LANGUAGE plpgsql;

-- Create tenants
SELECT create_tenant_schema('acme');
SELECT create_tenant_schema('globex');
```

### Switching Schemas

Use `search_path` to direct queries to the correct tenant:

```sql
-- Set search path for acme
SET search_path TO acme, public;

-- Now queries use acme schema
SELECT * FROM users;  -- Queries acme.users
INSERT INTO orders (user_id, amount) VALUES (1, 99.99);  -- Inserts into acme.orders
```

Application code:

```python
def get_tenant_connection(tenant_id):
    """Get a connection configured for a specific tenant."""
    conn = psycopg2.connect(dsn)
    cursor = conn.cursor()
    # Set search_path to tenant schema
    cursor.execute("SET search_path TO %s, public", (tenant_id,))
    return conn

# Usage
conn = get_tenant_connection('acme')
cursor = conn.cursor()
cursor.execute("SELECT * FROM users")  # Queries acme.users
```

### Schema Migrations

Apply migrations to all tenant schemas:

```python
def migrate_all_tenants(migration_sql):
    """Apply a migration to all tenant schemas."""
    conn = psycopg2.connect(dsn)
    cursor = conn.cursor()

    # Get all tenant schemas
    cursor.execute("""
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('public', 'pg_catalog', 'information_schema')
    """)
    schemas = [row[0] for row in cursor.fetchall()]

    for schema in schemas:
        cursor.execute(f"SET search_path TO {schema}")
        cursor.execute(migration_sql)
        print(f"Migrated {schema}")

    conn.commit()

# Example migration
migrate_all_tenants("ALTER TABLE users ADD COLUMN phone VARCHAR(20)")
```

### Pros and Cons

**Pros:**
- Good tenant isolation within a shared database
- Easy tenant-specific customizations
- Can restore individual tenant from backup
- Better noisy neighbor protection than shared tables

**Cons:**
- Schema migration complexity (must update all schemas)
- Connection pooling more challenging
- Cross-tenant queries require schema prefixes
- Harder to monitor and maintain as tenant count grows

## Approach 3: Separate Databases

### Implementation

```bash
# Create a new tenant database
createdb -O app_user tenant_acme
createdb -O app_user tenant_globex

# Apply schema migrations
psql -d tenant_acme -f schema.sql
psql -d tenant_globex -f schema.sql
```

### Connection Routing

Your application needs to route connections based on tenant:

```python
class TenantConnectionPool:
    """Manage connection pools per tenant."""

    def __init__(self):
        self.pools = {}

    def get_pool(self, tenant_id):
        if tenant_id not in self.pools:
            # Create pool for this tenant
            dsn = f"postgresql://user:pass@localhost/tenant_{tenant_id}"
            self.pools[tenant_id] = psycopg2.pool.ThreadedConnectionPool(
                minconn=2,
                maxconn=10,
                dsn=dsn
            )
        return self.pools[tenant_id]

    def get_connection(self, tenant_id):
        pool = self.get_pool(tenant_id)
        return pool.getconn()

# Usage
pool_manager = TenantConnectionPool()
conn = pool_manager.get_connection('acme')
```

### Pros and Cons

**Pros:**
- Strongest isolation (security and performance)
- Easy per-tenant backup and restore
- Can place high-value tenants on dedicated hardware
- Simplest mental model

**Cons:**
- Most operationally complex
- Connection pooling per database
- Cross-tenant analytics requires additional infrastructure
- Higher resource overhead

## Choosing the Right Approach

### Decision Matrix

| Factor | Shared Tables | Separate Schemas | Separate Databases |
|--------|--------------|------------------|-------------------|
| Tenant count | 1000+ | 100-1000 | 10-100 |
| Isolation needs | Low | Medium | High |
| Customization | None | Some | Full |
| Ops complexity | Low | Medium | High |
| Cross-tenant queries | Easy | Medium | Hard |
| Backup granularity | Database | Database | Per-tenant |

### Recommendations

**Choose Shared Tables when:**
- You have many small tenants (B2C SaaS)
- Tenants have identical schemas
- You need easy cross-tenant analytics
- Operational simplicity is priority

**Choose Separate Schemas when:**
- You have moderate tenant count
- Tenants may need slight customizations
- You need better isolation than shared tables
- Individual tenant restores are required

**Choose Separate Databases when:**
- Tenants have strict compliance requirements
- You have few high-value enterprise customers
- Tenants need complete isolation
- Per-tenant performance guarantees are required

## Hybrid Approach

Many SaaS applications use a hybrid model:

```
┌─────────────────────────────────────────────┐
│              Shared Database                │
│  (Small tenants - shared tables with RLS)   │
│  ├─ tenant_id: small_co_1                   │
│  ├─ tenant_id: small_co_2                   │
│  └─ tenant_id: small_co_3                   │
└─────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ Database:       │  │ Database:       │
│ enterprise_acme │  │ enterprise_mega │
│ (Dedicated)     │  │ (Dedicated)     │
└─────────────────┘  └─────────────────┘
```

Route tenants based on their plan:

```python
def get_tenant_dsn(tenant):
    if tenant.plan == 'enterprise':
        return f"postgresql://user:pass@db-{tenant.id}.example.com/main"
    else:
        return "postgresql://user:pass@shared-db.example.com/multi_tenant"
```

This lets you optimize costs for small tenants while providing premium isolation for enterprise customers willing to pay for it.

## Summary

The right multi-tenant architecture depends on your specific needs:

1. **Start with shared tables** for simplicity and scale
2. **Add Row Level Security** to enforce tenant isolation
3. **Consider separate schemas** when you need per-tenant customization
4. **Use separate databases** for high-isolation requirements or enterprise tiers

Whatever approach you choose, ensure your application code consistently enforces tenant boundaries. A single missing WHERE clause can expose one tenant's data to another.
