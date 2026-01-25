# How to Use Row-Level Security in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Security, RLS, Row-Level Security, Access Control, Multi-tenant

Description: Learn how to implement row-level security (RLS) in PostgreSQL to control data access at the row level. This guide covers policies, multi-tenant applications, and security best practices.

---

Row-Level Security (RLS) in PostgreSQL allows you to control which rows users can access based on security policies defined at the database level. Instead of filtering data in your application code, you can enforce access rules directly in the database, making your security more robust and centralized. This is particularly valuable for multi-tenant applications, compliance requirements, and defense-in-depth security strategies.

---

## How Row-Level Security Works

```mermaid
graph TD
    A[User Query] --> B{RLS Enabled?}
    B -->|No| C[Return All Rows]
    B -->|Yes| D[Apply Policies]
    D --> E{User Role?}
    E -->|Admin| F[Admin Policy]
    E -->|Regular User| G[User Policy]
    F --> H[Filter Rows]
    G --> H
    H --> I[Return Filtered Results]
```

Without RLS, access control happens at the table level (you can SELECT from a table or not). With RLS, access control happens at the row level (you can only see rows that match your policies).

---

## Basic RLS Setup

### Enable RLS on a Table

```sql
-- Create a sample table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    owner_id INTEGER NOT NULL,
    department TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable row-level security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- By default, with RLS enabled and no policies, no rows are visible
-- (except to table owners and superusers)
```

### Create a Simple Policy

```sql
-- Allow users to see only their own documents
CREATE POLICY user_documents_policy ON documents
    FOR ALL
    TO PUBLIC
    USING (owner_id = current_user_id());

-- The USING clause defines which rows are visible
-- current_user_id() would be a function you create to get the user ID
```

### Create the User ID Function

```sql
-- Option 1: Use a session variable
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- Set the user ID at the start of each session
SET app.current_user_id = '123';

-- Option 2: Use application_name (less secure but simpler)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN split_part(current_setting('application_name'), ':', 2)::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Policy Types and Commands

### Separate Policies for SELECT, INSERT, UPDATE, DELETE

```sql
-- SELECT policy: Users can see their own documents
CREATE POLICY select_own_documents ON documents
    FOR SELECT
    USING (owner_id = current_user_id());

-- INSERT policy: Users can only insert documents owned by themselves
CREATE POLICY insert_own_documents ON documents
    FOR INSERT
    WITH CHECK (owner_id = current_user_id());

-- UPDATE policy: Users can only update their own documents
CREATE POLICY update_own_documents ON documents
    FOR UPDATE
    USING (owner_id = current_user_id())      -- Which rows they can see
    WITH CHECK (owner_id = current_user_id()); -- What values they can set

-- DELETE policy: Users can only delete their own documents
CREATE POLICY delete_own_documents ON documents
    FOR DELETE
    USING (owner_id = current_user_id());
```

### Understanding USING vs WITH CHECK

```sql
-- USING: Filters rows for SELECT, UPDATE (existing rows), DELETE
-- WITH CHECK: Validates new data for INSERT and UPDATE (new values)

-- Example: Allow users to see public documents but only modify their own
CREATE POLICY view_documents ON documents
    FOR SELECT
    USING (
        owner_id = current_user_id()  -- Own documents
        OR is_public = true            -- Or public documents
    );

CREATE POLICY modify_documents ON documents
    FOR UPDATE
    USING (owner_id = current_user_id())        -- Can only see own docs
    WITH CHECK (owner_id = current_user_id());  -- Can only set own ID
```

---

## Multi-Tenant Application

RLS is perfect for multi-tenant SaaS applications.

### Tenant Isolation Setup

```sql
-- Create tenant-aware tables
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    tenant_id INTEGER REFERENCES tenants(id),
    role TEXT DEFAULT 'user'
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN current_setting('app.tenant_id', true)::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON projects
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
```

### Application Integration

```python
# Python example: Set tenant context for each request
import psycopg2
from flask import Flask, g, request

app = Flask(__name__)

def get_db_connection():
    """Get database connection with tenant context"""
    conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")

    # Set tenant ID from request context
    tenant_id = get_tenant_from_request(request)
    user_id = get_user_from_request(request)

    with conn.cursor() as cur:
        cur.execute("SET app.tenant_id = %s", (tenant_id,))
        cur.execute("SET app.current_user_id = %s", (user_id,))

    return conn

@app.before_request
def before_request():
    g.db = get_db_connection()

@app.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()

@app.route('/projects')
def list_projects():
    # RLS automatically filters to current tenant
    cur = g.db.cursor()
    cur.execute("SELECT * FROM projects")  # Only sees tenant's projects
    projects = cur.fetchall()
    return jsonify(projects)
```

---

## Role-Based Access Control

Combine RLS with PostgreSQL roles for hierarchical access.

```sql
-- Create roles
CREATE ROLE app_admin;
CREATE ROLE app_manager;
CREATE ROLE app_user;

-- Create users assigned to roles
CREATE USER admin_user WITH PASSWORD 'pass';
GRANT app_admin TO admin_user;

-- Policy for admins: see everything in their tenant
CREATE POLICY admin_access ON projects
    FOR ALL
    TO app_admin
    USING (tenant_id = current_tenant_id());  -- No additional restrictions

-- Policy for managers: see team projects
CREATE POLICY manager_access ON projects
    FOR ALL
    TO app_manager
    USING (
        tenant_id = current_tenant_id()
        AND (
            created_by = current_user_id()
            OR team_id IN (SELECT team_id FROM team_members WHERE user_id = current_user_id())
        )
    );

-- Policy for regular users: see only own projects
CREATE POLICY user_access ON projects
    FOR ALL
    TO app_user
    USING (
        tenant_id = current_tenant_id()
        AND created_by = current_user_id()
    );
```

---

## Advanced Patterns

### Time-Based Access

```sql
-- Documents are only visible during business hours
CREATE POLICY business_hours_only ON sensitive_documents
    FOR SELECT
    USING (
        owner_id = current_user_id()
        AND EXTRACT(HOUR FROM NOW()) BETWEEN 9 AND 17
        AND EXTRACT(DOW FROM NOW()) BETWEEN 1 AND 5
    );
```

### Soft Delete with RLS

```sql
-- Table with soft delete
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    deleted_at TIMESTAMP  -- NULL means not deleted
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy hides soft-deleted rows automatically
CREATE POLICY hide_deleted ON tasks
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND owner_id = current_user_id()
    );

-- Now SELECT * FROM tasks automatically excludes deleted rows
```

### Audit Trail Protection

```sql
-- Audit logs that can only be inserted, never modified
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow inserts but no updates or deletes
CREATE POLICY audit_insert ON audit_logs
    FOR INSERT
    WITH CHECK (true);  -- Anyone can insert

CREATE POLICY audit_select ON audit_logs
    FOR SELECT
    USING (
        user_id = current_user_id()  -- Users see their own logs
        OR is_admin()                 -- Admins see all
    );

-- No UPDATE or DELETE policies = no modifications allowed
```

### Hierarchical Data Access

```sql
-- Organization hierarchy
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES organizations(id)
);

CREATE TABLE org_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    org_id INTEGER REFERENCES organizations(id)
);

ALTER TABLE org_documents ENABLE ROW LEVEL SECURITY;

-- Recursive CTE to get all accessible organizations
CREATE OR REPLACE FUNCTION get_accessible_orgs(user_org_id INTEGER)
RETURNS TABLE(org_id INTEGER) AS $$
    WITH RECURSIVE org_tree AS (
        -- Base: user's organization
        SELECT id FROM organizations WHERE id = user_org_id
        UNION
        -- Recursive: child organizations
        SELECT o.id FROM organizations o
        JOIN org_tree ot ON o.parent_id = ot.id
    )
    SELECT id FROM org_tree;
$$ LANGUAGE sql STABLE;

-- Policy using the function
CREATE POLICY org_hierarchy ON org_documents
    FOR ALL
    USING (org_id IN (SELECT get_accessible_orgs(current_org_id())));
```

---

## Bypassing RLS (When Needed)

### Superuser and Table Owners

```sql
-- Superusers always bypass RLS
-- Table owners bypass RLS by default

-- Force RLS on table owner too
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Now even the table owner must follow policies
```

### Service Account Bypass

```sql
-- Create a service role that bypasses RLS
CREATE ROLE service_account BYPASSRLS;

-- Or create a policy that allows service accounts
CREATE POLICY service_bypass ON documents
    FOR ALL
    TO service_account
    USING (true);  -- See everything
```

---

## Testing RLS Policies

```sql
-- Test as different users
SET ROLE app_user;
SET app.current_user_id = '1';
SET app.tenant_id = '100';

-- Should only see user 1's documents in tenant 100
SELECT * FROM documents;

-- Try to access another user's document
SELECT * FROM documents WHERE id = 999;  -- Returns empty if not authorized

-- Try to insert with wrong owner_id
INSERT INTO documents (title, owner_id)
VALUES ('Test', 999);  -- Should fail WITH CHECK violation

-- Reset
RESET ROLE;
```

### Debugging Policies

```sql
-- View all policies on a table
SELECT
    polname AS policy_name,
    polcmd AS command,
    polroles::regrole[] AS roles,
    polqual AS using_expression,
    polwithcheck AS with_check_expression
FROM pg_policy
WHERE polrelid = 'documents'::regclass;

-- Check if RLS is enabled
SELECT
    relname,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'documents';
```

---

## Performance Considerations

```sql
-- Add indexes for columns used in policies
CREATE INDEX idx_documents_owner ON documents (owner_id);
CREATE INDEX idx_documents_tenant ON documents (tenant_id);

-- For complex policies, consider partial indexes
CREATE INDEX idx_documents_public ON documents (id)
WHERE is_public = true;

-- Use EXPLAIN to verify policy efficiency
EXPLAIN ANALYZE SELECT * FROM documents WHERE title LIKE 'Report%';
-- Check that the policy filter is applied efficiently
```

---

## Best Practices

1. **Use session variables** for user context rather than function parameters
2. **Create indexes** on columns used in policy conditions
3. **Test policies thoroughly** with different user roles
4. **Use FORCE ROW LEVEL SECURITY** if table owners should also follow policies
5. **Keep policies simple** for better performance and maintainability
6. **Document your policies** as they are not visible in application code
7. **Combine with column-level permissions** for complete access control

---

## Conclusion

Row-Level Security in PostgreSQL provides powerful, database-enforced access control that:

- Centralizes security logic in the database
- Prevents data leaks even if application code has bugs
- Simplifies application code by removing filtering logic
- Supports complex multi-tenant and RBAC scenarios

By implementing RLS, you add a robust security layer that protects your data regardless of how it is accessed.

---

*Need to monitor your PostgreSQL security policies? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including access pattern analysis, security alerts, and compliance reporting.*
