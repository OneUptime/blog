# How to Secure Multi-Tenant Data with Row-Level Security in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Row-Level Security, Multi-Tenancy, Security, Database, Access Control

Description: Learn how to implement row-level security (RLS) in PostgreSQL to isolate tenant data in multi-tenant applications. This guide covers policy creation, performance considerations, and real-world implementation patterns.

---

> In multi-tenant applications, data isolation is not optional. A single bug that exposes one customer's data to another can destroy your business. PostgreSQL Row-Level Security (RLS) provides database-enforced isolation that works even when your application code has bugs.

This guide shows you how to implement RLS for multi-tenant applications with practical examples and performance considerations.

---

## Why Row-Level Security?

Traditional multi-tenant isolation relies on your application code:

```sql
-- Application-level filtering (risky)
SELECT * FROM invoices WHERE tenant_id = $1;
-- What if a developer forgets the WHERE clause?
```

With RLS, the database enforces isolation automatically:

```sql
-- RLS-enforced filtering (safe)
SELECT * FROM invoices;
-- PostgreSQL automatically adds: WHERE tenant_id = current_tenant()
```

Even if your application has bugs, the database prevents cross-tenant data access.

---

## Setting Up Row-Level Security

### Step 1: Create the Tenant Infrastructure

```sql
-- Create a tenant tracking table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create application tables with tenant_id
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient tenant filtering
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
```

### Step 2: Create the Session Variable Function

PostgreSQL needs a way to know the current tenant. We use session variables:

```sql
-- Function to get current tenant from session
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Get tenant_id from session variable
    -- Returns NULL if not set (will deny all access)
    RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to set current tenant (call at connection start)
CREATE OR REPLACE FUNCTION set_tenant(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Enable RLS and Create Policies

```sql
-- Enable RLS on tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create isolation policies for customers table
CREATE POLICY tenant_isolation_select ON customers
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_insert ON customers
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_update ON customers
    FOR UPDATE
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_delete ON customers
    FOR DELETE
    USING (tenant_id = current_tenant_id());

-- Create isolation policies for invoices table
CREATE POLICY tenant_isolation_select ON invoices
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_insert ON invoices
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_update ON invoices
    FOR UPDATE
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_delete ON invoices
    FOR DELETE
    USING (tenant_id = current_tenant_id());
```

---

## Using RLS in Your Application

### Connection Setup

Every database connection must set the tenant context:

```python
# Python with psycopg2
import psycopg2

def get_connection(tenant_id: str):
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor() as cur:
        # Set tenant context for this connection
        cur.execute("SELECT set_tenant(%s)", (tenant_id,))
    conn.commit()
    return conn

# Usage
conn = get_connection("550e8400-e29b-41d4-a716-446655440000")
with conn.cursor() as cur:
    # This query automatically filters by tenant
    cur.execute("SELECT * FROM customers")
    customers = cur.fetchall()  # Only returns current tenant's customers
```

### FastAPI Integration

```python
# fastapi_rls.py
from fastapi import FastAPI, Depends, Request
from contextlib import asynccontextmanager
import asyncpg

app = FastAPI()

# Database pool
pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL)
    yield
    await pool.close()

app = FastAPI(lifespan=lifespan)

async def get_db(request: Request):
    """Get a tenant-scoped database connection"""
    # Extract tenant from JWT token or subdomain
    tenant_id = request.state.tenant_id

    async with pool.acquire() as conn:
        # Set tenant context
        await conn.execute("SELECT set_tenant($1)", tenant_id)
        yield conn

@app.get("/customers")
async def list_customers(conn = Depends(get_db)):
    # RLS automatically filters to current tenant
    rows = await conn.fetch("SELECT id, name, email FROM customers")
    return [dict(r) for r in rows]

@app.post("/customers")
async def create_customer(
    name: str,
    email: str,
    request: Request,
    conn = Depends(get_db)
):
    tenant_id = request.state.tenant_id
    # RLS enforces tenant_id matches current tenant
    customer_id = await conn.fetchval(
        """INSERT INTO customers (tenant_id, name, email)
           VALUES ($1, $2, $3) RETURNING id""",
        tenant_id, name, email
    )
    return {"id": customer_id}
```

---

## Advanced Policy Patterns

### Role-Based Access Within Tenants

Sometimes you need finer-grained access control within a tenant:

```sql
-- Add user role tracking
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'admin', 'manager', 'staff'
    UNIQUE(tenant_id, user_id)
);

-- Function to get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN current_setting('app.user_role', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Policy: Staff can only see their own customers
CREATE POLICY staff_customer_access ON customers
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('admin', 'manager')
            OR assigned_staff_id = current_setting('app.user_id', true)::UUID
        )
    );
```

### Audit Logging with RLS

```sql
-- Audit log table (no RLS - admins can see everything)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trigger function to log changes
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (tenant_id, table_name, operation, record_id, old_data, new_data, user_id)
    VALUES (
        current_tenant_id(),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
        NULLIF(current_setting('app.user_id', true), '')::UUID
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER customers_audit
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Performance Considerations

### Indexing for RLS

RLS policies add WHERE clauses to every query. Ensure you have proper indexes:

```sql
-- Essential: Index on tenant_id for every table with RLS
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);

-- Better: Composite indexes including tenant_id
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);

-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM customers WHERE email = 'test@example.com';
-- Should show: Index Scan using idx_customers_tenant_email
```

### Partition by Tenant for Large Scale

For very large deployments, partition tables by tenant:

```sql
-- Create partitioned table
CREATE TABLE invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id)
) PARTITION BY HASH (tenant_id);

-- Create partitions
CREATE TABLE invoices_p0 PARTITION OF invoices
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE invoices_p1 PARTITION OF invoices
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE invoices_p2 PARTITION OF invoices
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE invoices_p3 PARTITION OF invoices
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- RLS on parent automatically applies to partitions
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
    FOR ALL
    USING (tenant_id = current_tenant_id());
```

---

## Bypassing RLS for Admin Operations

Sometimes administrators need to access all data:

```sql
-- Create an admin role that bypasses RLS
CREATE ROLE tenant_admin;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
-- FORCE ensures RLS applies even to table owners

-- Grant bypass to admin role
GRANT ALL ON customers TO tenant_admin;
ALTER ROLE tenant_admin BYPASSRLS;

-- Or create a policy that allows admin access
CREATE POLICY admin_all_access ON customers
    FOR ALL
    TO tenant_admin
    USING (true)
    WITH CHECK (true);
```

For application-level admin access:

```sql
-- Temporary bypass for specific operations
CREATE OR REPLACE FUNCTION admin_get_all_customers()
RETURNS SETOF customers AS $$
BEGIN
    -- Execute as table owner (bypasses RLS)
    RETURN QUERY SELECT * FROM customers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict who can call this function
REVOKE EXECUTE ON FUNCTION admin_get_all_customers FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_all_customers TO admin_role;
```

---

## Testing RLS Policies

Always test your policies thoroughly:

```sql
-- Create test data
INSERT INTO tenants (id, name, subdomain) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Corp', 'acme'),
    ('22222222-2222-2222-2222-222222222222', 'Widget Inc', 'widget');

INSERT INTO customers (tenant_id, name, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Alice', 'alice@acme.com'),
    ('22222222-2222-2222-2222-222222222222', 'Bob', 'bob@widget.com');

-- Test isolation
SELECT set_tenant('11111111-1111-1111-1111-111111111111');
SELECT * FROM customers;  -- Should only see Alice

SELECT set_tenant('22222222-2222-2222-2222-222222222222');
SELECT * FROM customers;  -- Should only see Bob

-- Test insert protection
SELECT set_tenant('11111111-1111-1111-1111-111111111111');
INSERT INTO customers (tenant_id, name, email)
VALUES ('22222222-2222-2222-2222-222222222222', 'Hacker', 'hacker@evil.com');
-- Should fail: new row violates row-level security policy
```

---

## Common Pitfalls

### 1. Forgetting to Set Tenant Context

```python
# Wrong: No tenant context set
conn = get_raw_connection()
conn.execute("SELECT * FROM customers")  # Returns nothing!

# Right: Always set tenant context
conn.execute("SELECT set_tenant($1)", (tenant_id,))
conn.execute("SELECT * FROM customers")  # Returns tenant's data
```

### 2. RLS Not Applying to Superusers

```sql
-- Superusers bypass RLS by default
-- Use FORCE to apply RLS to table owners too
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
```

### 3. Performance Issues Without Indexes

```sql
-- Check query plans include index scans
EXPLAIN ANALYZE SELECT * FROM customers WHERE email = 'test@example.com';

-- If you see Seq Scan, add appropriate indexes
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);
```

---

## Conclusion

Row-Level Security provides database-enforced data isolation that protects your multi-tenant application even when bugs exist in your code. The key principles are:

1. Always include tenant_id in every table
2. Set tenant context at the start of every connection
3. Create policies for all operations (SELECT, INSERT, UPDATE, DELETE)
4. Index tenant_id columns for performance
5. Test policies thoroughly before deploying

With RLS, a developer forgetting a WHERE clause does not become a security incident. The database has your back.

---

*Want to monitor your multi-tenant database for security and performance? [OneUptime](https://oneuptime.com) provides database monitoring with query analysis, connection tracking, and alerting for PostgreSQL.*

**Related Reading:**
- [How to Implement Connection Pooling in Python for PostgreSQL](https://oneuptime.com/blog/post/2025-01-06-python-connection-pooling-postgresql/view)
- [How to Scale Tables with Time-Based Partitioning in PostgreSQL](https://oneuptime.com/blog/post/2026-01-26-time-based-partitioning-postgresql/view)
