# How to Use Row-Level Security in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, SQL, Database, Access Control, Row-Level Security

Description: Learn how to implement row-level security in ClickHouse using row policies so different users see only the rows they are authorized to access.

---

Row-level security (RLS) in ClickHouse is implemented through row policies. A row policy is a filter expression attached to a table and user (or role) that ClickHouse automatically appends to every query on that table. Users subject to a row policy can only see rows that satisfy the policy expression - they cannot bypass it or even know it exists from their perspective.

## When to Use Row Policies

Row policies are useful when:

- Multiple tenants share the same table and each should see only their own data
- Users in different regions or departments should see only their regional records
- A read-only role should see only non-deleted or non-sensitive rows
- Analysts should see recent data but not historical PII records

## How Row Policies Work

A row policy is defined with `CREATE ROW POLICY` and contains a `USING` clause that is an SQL expression evaluating to a boolean. ClickHouse appends this expression as an `AND` condition to the `WHERE` clause of every `SELECT` query on that table, including subqueries and the `SELECT` part of `INSERT ... SELECT` statements.

## Example Table Setup

```sql
CREATE DATABASE multitenant;

CREATE TABLE multitenant.orders
(
    order_id  UInt64,
    tenant_id UInt32,
    user_id   UInt32,
    amount    Decimal(10, 2),
    status    LowCardinality(String),
    region    LowCardinality(String),
    created_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (tenant_id, created_at, order_id);

INSERT INTO multitenant.orders VALUES
    (1, 101, 1, 99.99,  'completed', 'us-east', now()),
    (2, 101, 2, 49.50,  'pending',   'us-west', now()),
    (3, 102, 3, 200.00, 'completed', 'eu-west', now()),
    (4, 102, 4, 75.25,  'refunded',  'eu-west', now());
```

## Creating Users for the Example

```sql
CREATE USER tenant_101
    IDENTIFIED WITH sha256_password BY 'Tenant101Pass!'
    DEFAULT DATABASE multitenant;

CREATE USER tenant_102
    IDENTIFIED WITH sha256_password BY 'Tenant102Pass!'
    DEFAULT DATABASE multitenant;

GRANT SELECT ON multitenant.orders TO tenant_101;
GRANT SELECT ON multitenant.orders TO tenant_102;
```

## Creating Row Policies

Create a policy that restricts each tenant to their own rows:

```sql
-- tenant_101 sees only rows where tenant_id = 101
CREATE ROW POLICY tenant_101_policy
    ON multitenant.orders
    FOR SELECT
    USING tenant_id = 101
    TO tenant_101;

-- tenant_102 sees only rows where tenant_id = 102
CREATE ROW POLICY tenant_102_policy
    ON multitenant.orders
    FOR SELECT
    USING tenant_id = 102
    TO tenant_102;
```

Now when `tenant_101` runs:

```sql
SELECT * FROM multitenant.orders;
```

ClickHouse automatically executes:

```sql
SELECT * FROM multitenant.orders WHERE tenant_id = 101;
```

## Applying a Policy to a Role

Instead of assigning policies to individual users, assign them to a role:

```sql
CREATE ROLE us_reader;
GRANT SELECT ON multitenant.orders TO us_reader;

-- Only US region rows visible to this role
CREATE ROW POLICY us_region_policy
    ON multitenant.orders
    FOR SELECT
    USING region IN ('us-east', 'us-west')
    TO us_reader;

-- Assign role to users
GRANT us_reader TO tenant_101;
```

## Row Policies and INSERT ... SELECT

Row policies defined `FOR SELECT` also filter the `SELECT` part of `INSERT ... SELECT` operations. For example, if `tenant_101` has a row policy restricting them to `tenant_id = 101`, then an `INSERT ... SELECT` run by that user will only read rows matching the policy filter. Note that row policies do not restrict direct `INSERT VALUES` statements — they make sense only for users with readonly access.

## Default Restrictive Policy

By default, if no row policy applies to a user, they see all rows. To flip this and make tables invisible by default unless a policy explicitly grants access, create a permissive/restrictive pair:

```sql
-- Block everyone from seeing any rows on this table by default
CREATE ROW POLICY deny_all
    ON multitenant.orders
    FOR SELECT
    USING 0
    TO ALL;

-- Then explicitly allow specific roles
CREATE ROW POLICY allow_tenant_101
    ON multitenant.orders
    FOR SELECT
    USING tenant_id = 101
    TO tenant_101;
```

The `USING 0` expression is always false, so no rows are returned. The second policy for `tenant_101` overrides it for that user.

## Viewing Current Row Policies

```sql
-- List all row policies
SELECT short_name, database, table, select_filter, is_restrictive
FROM system.row_policies
ORDER BY database, table;

-- Show policies on a specific table
SELECT *
FROM system.row_policies
WHERE table = 'orders'
  AND database = 'multitenant';
```

## Modifying a Row Policy

```sql
-- Change the filter expression
ALTER ROW POLICY tenant_101_policy
    ON multitenant.orders
    USING tenant_id = 101 AND status != 'deleted';
```

## Dropping Row Policies

```sql
DROP ROW POLICY IF EXISTS tenant_101_policy ON multitenant.orders;
DROP ROW POLICY IF EXISTS tenant_102_policy ON multitenant.orders;
```

## Dynamic Policies Using currentUser()

Use the built-in `currentUser()` function to create a single policy that works for all users without needing one policy per user:

```sql
-- Requires a mapping table
CREATE TABLE multitenant.user_tenant_map
(
    username  String,
    tenant_id UInt32
)
ENGINE = MergeTree()
ORDER BY username;

INSERT INTO multitenant.user_tenant_map VALUES
    ('tenant_101', 101),
    ('tenant_102', 102);

-- Single policy using subquery
CREATE ROW POLICY dynamic_tenant_policy
    ON multitenant.orders
    FOR SELECT
    USING tenant_id IN (
        SELECT tenant_id
        FROM multitenant.user_tenant_map
        WHERE username = currentUser()
    )
    TO ALL;
```

## Important Notes

- Row policies add a `WHERE` filter internally. They do not hide column names or schema.
- The `default` user and users with `SHOW ROW POLICIES` privilege can inspect all policies.
- Row policies apply to `SELECT` queries, including subqueries and the `SELECT` part of `INSERT ... SELECT` statements. They do not filter `DELETE` or direct `INSERT VALUES` operations.
- Policies are enforced server-side and cannot be bypassed by the client.

## Summary

Row-level security in ClickHouse is implemented through row policies attached to tables and users or roles. Define a `USING` filter expression that ClickHouse automatically appends to every query. Use role-based policies for maintainability, `currentUser()` for dynamic per-user filtering, and the `deny_all` pattern to secure tables by default. Inspect active policies in `system.row_policies`.
