# How to Implement Row-Level Security in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Row-Level Security, Access Control, Multi-Tenant, Security

Description: A comprehensive guide to implementing row-level security in ClickHouse using row policies for multi-tenant data access, user isolation, and compliance requirements.

---

Row-level security (RLS) in ClickHouse enables fine-grained access control at the row level, essential for multi-tenant applications and compliance requirements.

## Understanding Row Policies

### Basic Row Policy

```sql
-- Create a multi-tenant table
CREATE TABLE tenant_data (
    tenant_id UInt32,
    record_id UInt64,
    data String,
    created_at DateTime
) ENGINE = MergeTree()
ORDER BY (tenant_id, record_id);

-- Create a row policy for tenant isolation
CREATE ROW POLICY tenant_policy ON tenant_data
FOR SELECT
USING tenant_id = currentUserId();

-- Or using a custom setting
CREATE ROW POLICY tenant_policy ON tenant_data
FOR SELECT
USING tenant_id = toUInt32(getSetting('current_tenant_id'));
```

### User-Specific Policies

```sql
-- Create users for each tenant
CREATE USER tenant_100 IDENTIFIED BY 'password'
SETTINGS current_tenant_id = 100;

CREATE USER tenant_200 IDENTIFIED BY 'password'
SETTINGS current_tenant_id = 200;

-- Policy automatically filters based on user setting
SELECT * FROM tenant_data;  -- Only sees rows for their tenant
```

## Advanced Policy Patterns

### Multiple Conditions

```sql
-- Policy with multiple conditions
CREATE ROW POLICY region_policy ON sales_data
FOR SELECT
USING region IN (
    SELECT allowed_region
    FROM user_permissions
    WHERE user_name = currentUser()
);

-- Time-based access
CREATE ROW POLICY retention_policy ON sensitive_data
FOR SELECT
USING created_at >= now() - INTERVAL 90 DAY
TO analyst_role;
```

### Hierarchical Access

```sql
-- Manager sees all their team's data
CREATE ROW POLICY manager_policy ON employee_data
FOR SELECT
USING
    employee_id = currentUserId()  -- Own data
    OR manager_id = currentUserId()  -- Direct reports
TO manager_role;

-- Admin sees everything
CREATE ROW POLICY admin_policy ON employee_data
FOR SELECT
USING 1 = 1
TO admin_role;
```

## Managing Policies

```sql
-- List all policies
SHOW ROW POLICIES;

-- Show specific policy
SHOW CREATE ROW POLICY tenant_policy ON tenant_data;

-- Modify policy
ALTER ROW POLICY tenant_policy ON tenant_data
USING tenant_id = toUInt32(getSetting('current_tenant_id'))
TO ALL EXCEPT admin;

-- Drop policy
DROP ROW POLICY IF EXISTS tenant_policy ON tenant_data;
```

## Testing Row Policies

```sql
-- Insert test data
INSERT INTO tenant_data VALUES
    (100, 1, 'Tenant 100 data', now()),
    (100, 2, 'Tenant 100 data', now()),
    (200, 1, 'Tenant 200 data', now());

-- Test as tenant_100
-- Connect as tenant_100 user
SELECT * FROM tenant_data;
-- Result: Only rows where tenant_id = 100
```

## Conclusion

Row-level security in ClickHouse provides:

1. **Tenant isolation** for multi-tenant applications
2. **User-specific** data access control
3. **Flexible policies** with complex conditions
4. **Compliance** support for data privacy requirements

Implement RLS carefully and test thoroughly to ensure proper data isolation.
