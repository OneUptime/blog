# How to Implement Row-Level Security in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Row-Level Security, RLS, Multi-tenant, Security, Access Control

Description: A comprehensive guide to implementing PostgreSQL row-level security (RLS) for multi-tenant applications, covering policy creation, user context management, and performance optimization.

---

Row-Level Security (RLS) in PostgreSQL enables fine-grained access control at the row level. It's essential for multi-tenant applications, data isolation, and compliance requirements. This guide covers complete RLS implementation.

## Prerequisites

- PostgreSQL 9.5+ (RLS introduced)
- Understanding of PostgreSQL roles and privileges
- Multi-tenant or data isolation requirements

## How RLS Works

```
Without RLS:
SELECT * FROM orders;  -> Returns ALL rows

With RLS:
SELECT * FROM orders;  -> Returns only rows user can access
                          (filtered automatically)
```

## Basic RLS Setup

### Enable RLS on Table

```sql
-- Create table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (optional)
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
```

### Create Basic Policy

```sql
-- Allow users to see only their own documents
CREATE POLICY documents_owner_policy ON documents
    FOR ALL
    TO PUBLIC
    USING (owner_id = current_user_id());

-- current_user_id() is a custom function we'll create
```

### User Context Function

```sql
-- Create function to get current user ID from session
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INTEGER AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
$$ LANGUAGE SQL STABLE;

-- Set user context at connection time
SET app.current_user_id = '123';

-- Now queries are filtered automatically
SELECT * FROM documents;  -- Only shows owner_id = 123
```

## Policy Types

### SELECT Policy

```sql
-- Users can only read their own documents
CREATE POLICY documents_select ON documents
    FOR SELECT
    USING (owner_id = current_user_id());
```

### INSERT Policy

```sql
-- Users can only insert documents they own
CREATE POLICY documents_insert ON documents
    FOR INSERT
    WITH CHECK (owner_id = current_user_id());
```

### UPDATE Policy

```sql
-- Users can only update their own documents
CREATE POLICY documents_update ON documents
    FOR UPDATE
    USING (owner_id = current_user_id())
    WITH CHECK (owner_id = current_user_id());
```

### DELETE Policy

```sql
-- Users can only delete their own documents
CREATE POLICY documents_delete ON documents
    FOR DELETE
    USING (owner_id = current_user_id());
```

### Combined Policy

```sql
-- Single policy for all operations
CREATE POLICY documents_all ON documents
    FOR ALL
    USING (owner_id = current_user_id())
    WITH CHECK (owner_id = current_user_id());
```

## Multi-Tenant Implementation

### Tenant-Based RLS

```sql
-- Multi-tenant table
CREATE TABLE tenant_data (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tenant context function
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS INTEGER AS $$
    SELECT NULLIF(current_setting('app.tenant_id', true), '')::INTEGER;
$$ LANGUAGE SQL STABLE;

-- Enable RLS
ALTER TABLE tenant_data ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON tenant_data
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
```

### Setting Tenant Context

```sql
-- At connection/request start
SET app.tenant_id = '42';

-- All queries now filtered by tenant_id = 42
SELECT * FROM tenant_data;

-- Reset for admin operations (if allowed)
RESET app.tenant_id;
```

### Application Integration

```python
# Python/psycopg example
import psycopg

def get_connection(tenant_id):
    conn = psycopg.connect("dbname=myapp user=appuser")
    with conn.cursor() as cur:
        cur.execute("SET app.tenant_id = %s", (tenant_id,))
    return conn

# Each tenant gets isolated view
tenant_1_conn = get_connection(1)
tenant_2_conn = get_connection(2)
```

```javascript
// Node.js/pg example
const { Pool } = require('pg');

const pool = new Pool();

async function queryForTenant(tenantId, query, params) {
  const client = await pool.connect();
  try {
    await client.query('SET app.tenant_id = $1', [tenantId]);
    return await client.query(query, params);
  } finally {
    client.release();
  }
}
```

## Role-Based Access

### Role with Permissions

```sql
-- Create role hierarchy
CREATE TYPE user_role AS ENUM ('user', 'manager', 'admin');

-- Table with role-based access
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL,
    visibility user_role DEFAULT 'user',
    content TEXT
);

-- Context functions
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT current_setting('app.user_role', true)::user_role;
$$ LANGUAGE SQL STABLE;

-- Role-based policy
CREATE POLICY reports_role_policy ON reports
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND (
            owner_id = current_user_id()  -- Own reports
            OR visibility <= current_user_role()  -- Based on role
        )
    );
```

### Hierarchical Access

```sql
-- Managers see their team's data
CREATE TABLE team_members (
    user_id INTEGER,
    manager_id INTEGER
);

CREATE POLICY team_access ON documents
    FOR SELECT
    USING (
        owner_id = current_user_id()
        OR owner_id IN (
            SELECT user_id FROM team_members
            WHERE manager_id = current_user_id()
        )
    );
```

## Bypassing RLS (Admin Access)

### Superuser Bypass

```sql
-- Superusers bypass RLS by default
-- Use FORCE to apply RLS even to table owners
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
```

### Admin Role

```sql
-- Create admin role
CREATE ROLE admin_user;

-- Policy that allows admin full access
CREATE POLICY admin_full_access ON documents
    FOR ALL
    TO admin_user
    USING (true)
    WITH CHECK (true);

-- Or use BYPASSRLS attribute
ALTER ROLE admin_user BYPASSRLS;
```

### Service Account

```sql
-- Application service account with bypass
CREATE ROLE app_service WITH LOGIN PASSWORD 'secure' BYPASSRLS;

-- Background jobs use service account
-- Normal users use restricted role
```

## Performance Optimization

### Index Support

```sql
-- Index on columns used in RLS policies
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_tenant_data_tenant ON tenant_data(tenant_id);

-- Composite index for complex policies
CREATE INDEX idx_documents_tenant_owner ON documents(tenant_id, owner_id);
```

### Policy Simplification

```sql
-- GOOD: Simple, indexable condition
CREATE POLICY simple_policy ON documents
    USING (owner_id = current_user_id());

-- AVOID: Complex subqueries in policy
CREATE POLICY complex_policy ON documents
    USING (
        owner_id IN (
            SELECT id FROM users
            WHERE department = current_user_department()
        )
    );

-- BETTER: Denormalize or use materialized data
ALTER TABLE documents ADD COLUMN department_id INTEGER;
CREATE POLICY better_policy ON documents
    USING (department_id = current_department_id());
```

### Query Plan Analysis

```sql
-- Check query plan with RLS
SET app.current_user_id = '123';
EXPLAIN ANALYZE SELECT * FROM documents;

-- Look for:
-- - Index usage on policy columns
-- - No sequential scans on large tables
```

## Testing RLS

### Verify Policy Enforcement

```sql
-- Create test users
CREATE ROLE user1 LOGIN PASSWORD 'pass1';
CREATE ROLE user2 LOGIN PASSWORD 'pass2';

GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO user1, user2;
GRANT USAGE ON SEQUENCE documents_id_seq TO user1, user2;

-- Insert test data
SET app.current_user_id = '1';
INSERT INTO documents (owner_id, title) VALUES (1, 'User 1 Doc');

SET app.current_user_id = '2';
INSERT INTO documents (owner_id, title) VALUES (2, 'User 2 Doc');

-- Test isolation
SET app.current_user_id = '1';
SELECT * FROM documents;  -- Should only see User 1 Doc

SET app.current_user_id = '2';
SELECT * FROM documents;  -- Should only see User 2 Doc

-- Test insert protection
SET app.current_user_id = '1';
INSERT INTO documents (owner_id, title) VALUES (2, 'Attempt');
-- Should fail: new row violates policy
```

### Automated Testing

```sql
-- Test function
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS BOOLEAN AS $$
DECLARE
    count1 INTEGER;
    count2 INTEGER;
BEGIN
    -- User 1 context
    PERFORM set_config('app.current_user_id', '1', true);
    SELECT COUNT(*) INTO count1 FROM documents WHERE owner_id != 1;

    -- User 2 context
    PERFORM set_config('app.current_user_id', '2', true);
    SELECT COUNT(*) INTO count2 FROM documents WHERE owner_id != 2;

    -- Both should be 0 if RLS works correctly
    RETURN count1 = 0 AND count2 = 0;
END;
$$ LANGUAGE plpgsql;

SELECT test_rls_isolation();  -- Should return true
```

## Common Patterns

### Shared Resources

```sql
-- Some documents are public
CREATE POLICY documents_public ON documents
    FOR SELECT
    USING (
        owner_id = current_user_id()
        OR is_public = true
    );
```

### Time-Based Access

```sql
-- Access expires after certain time
CREATE POLICY time_limited_access ON documents
    FOR SELECT
    USING (
        owner_id = current_user_id()
        OR (
            shared_with @> ARRAY[current_user_id()]
            AND share_expires_at > NOW()
        )
    );
```

### Audit Logging

```sql
-- RLS doesn't prevent auditing
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT,
    operation TEXT,
    user_id INTEGER,
    row_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Audit trigger (runs with table owner privileges)
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, user_id, row_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        current_user_id(),
        row_to_json(COALESCE(NEW, OLD))
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER documents_audit
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

## Troubleshooting

### Policy Not Applied

```sql
-- Check if RLS is enabled
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'documents';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'documents';

-- Verify user context is set
SELECT current_setting('app.current_user_id', true);
```

### Permission Denied

```sql
-- Check user has base table privileges
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'documents';

-- Grant if missing
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO app_user;
```

### Unexpected Results

```sql
-- Test policy condition directly
SELECT *, (owner_id = current_user_id()) AS policy_result
FROM documents;

-- Check if BYPASSRLS is set
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = current_user;
```

## Best Practices

1. **Always index policy columns** - Essential for performance
2. **Keep policies simple** - Avoid complex subqueries
3. **Test thoroughly** - Verify isolation works correctly
4. **Use SECURITY DEFINER carefully** - For specific admin functions
5. **Set context early** - At connection or transaction start
6. **Combine with GRANT** - RLS adds to, doesn't replace permissions
7. **Document policies** - Clear understanding of access rules

## Conclusion

PostgreSQL Row-Level Security provides:

1. **Automatic filtering** - Queries are filtered transparently
2. **Multi-tenant isolation** - Single database, isolated data
3. **Fine-grained control** - Row-level access decisions
4. **Performance** - Efficient with proper indexing
5. **Compliance** - Data isolation for regulatory requirements

RLS is a powerful feature for building secure, multi-tenant applications on PostgreSQL.
