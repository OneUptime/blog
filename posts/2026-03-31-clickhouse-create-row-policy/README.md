# How to Create a Row Policy in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Security, Row Policy, Access Control

Description: Learn how to create row-level security policies in ClickHouse using CREATE ROW POLICY with USING filter expressions, and assign them to users and roles.

---

Row policies in ClickHouse implement row-level security: they restrict which rows a user or role can see when querying a table. When a row policy is applied to a user, ClickHouse automatically appends the policy's filter expression to every query that touches the protected table - transparent to the application, with no SQL changes required on the client side. Row policies are an essential tool for multi-tenant systems, PII data segregation, and compliance scenarios where different users must see different subsets of the same table.

## Basic CREATE ROW POLICY Syntax

```sql
CREATE ROW POLICY [IF NOT EXISTS | OR REPLACE] policy_name
ON [db.]table_name
[FOR SELECT]
USING condition_expr
[AS {PERMISSIVE | RESTRICTIVE}]
[TO {user | role | ALL | ALL EXCEPT user_or_role}]
```

Row policies in ClickHouse apply only to `SELECT` queries. They do not filter `INSERT`, `UPDATE` (mutations), or `DELETE` operations - row policies are intended to be used together with read-only access for the targeted users.

## Simple Row Filter Example

Allow users to see only rows where `tenant_id` matches their own:

```sql
-- Create a policy that filters rows by tenant_id
CREATE ROW POLICY tenant_isolation
ON analytics.events
FOR SELECT
USING tenant_id = currentUser()
TO ALL;
```

`currentUser()` returns the username of the currently authenticated user. This works when usernames are set equal to tenant identifiers. For more flexible lookups, use `dictGet` or subqueries.

## Permissive vs. Restrictive Policies

### PERMISSIVE (default)

A permissive policy grants access to rows that match its condition. Multiple permissive policies are combined with OR - a row is visible if it passes any permissive policy.

```sql
-- User can see their own rows
CREATE ROW POLICY see_own_data ON events
FOR SELECT
USING user_id = toUInt64(currentUser())
TO alice;

-- User can also see 'public' rows
CREATE ROW POLICY see_public_data ON events
FOR SELECT
USING is_public = 1
TO alice;
-- Alice sees rows matching EITHER condition (own OR public)
```

### RESTRICTIVE

A restrictive policy limits access. Multiple restrictive policies are combined with AND - a row is only visible if it passes ALL restrictive policies.

```sql
-- Only rows from the last 90 days
CREATE ROW POLICY recent_only ON events
AS RESTRICTIVE
FOR SELECT
USING event_date >= today() - 90
TO analyst_role;

-- Restrictive and permissive work together:
-- row must pass ALL restrictive + at least ONE permissive policy
```

## Targeting Users and Roles

```sql
-- Apply to a specific user
CREATE ROW POLICY my_policy ON events
FOR SELECT USING tenant_id = 'acme'
TO alice;

-- Apply to a role (all users with the role get the filter)
CREATE ROW POLICY my_policy ON events
FOR SELECT USING tenant_id = 'acme'
TO tenant_acme_role;

-- Apply to all users
CREATE ROW POLICY my_policy ON events
FOR SELECT USING is_public = 1
TO ALL;

-- Apply to all users except admins
CREATE ROW POLICY my_policy ON events
FOR SELECT USING tenant_id = currentUser()
TO ALL EXCEPT admin_role;
```

## Important: Default Deny Behavior

When ANY row policy exists on a table for `SELECT`, users who have no matching policy (neither permissive nor restrictive) will see zero rows. This is a critical behavior to understand before adding your first row policy to a table.

```sql
-- BEFORE adding any policy: all users see all rows

-- After adding this policy:
CREATE ROW POLICY tenant_filter ON events
FOR SELECT USING tenant_id = currentUser()
TO alice;

-- alice sees only her rows
-- bob (no policy assigned) now sees ZERO rows
-- admin must explicitly be excluded or given a policy

-- Fix: give admins an unrestricted policy
CREATE ROW POLICY admin_full_access ON events
FOR SELECT USING 1   -- always true
TO admin_role;
```

## Multi-Tenant Example

A complete pattern for a SaaS application with per-tenant data isolation:

```sql
-- Events table with tenant column
CREATE TABLE events
(
    event_time  DateTime,
    tenant_id   String,
    user_id     UInt64,
    event_type  String,
    payload     String
)
ENGINE = MergeTree()
ORDER BY (tenant_id, event_time);

-- Create one role per tenant
CREATE ROLE IF NOT EXISTS tenant_acme;
CREATE ROLE IF NOT EXISTS tenant_globex;

-- Assign the role to tenant users
CREATE USER acme_analyst IDENTIFIED BY 'password' DEFAULT ROLE tenant_acme;
CREATE USER globex_analyst IDENTIFIED BY 'password' DEFAULT ROLE tenant_globex;

-- Row policies filtered by tenant
CREATE ROW POLICY acme_isolation ON default.events
FOR SELECT USING tenant_id = 'acme'
TO tenant_acme;

CREATE ROW POLICY globex_isolation ON default.events
FOR SELECT USING tenant_id = 'globex'
TO tenant_globex;

-- Admin bypass - admins see all rows
CREATE ROLE IF NOT EXISTS super_admin;
CREATE ROW POLICY admin_bypass ON default.events
FOR SELECT USING 1
TO super_admin;
```

## Using dictGet in Row Policies

Reference a dictionary to look up the allowed tenant for a given user:

```sql
-- Dictionary mapping username to tenant_id
CREATE DICTIONARY user_tenant_map
(
    username  String,
    tenant_id String
)
PRIMARY KEY username
SOURCE(CLICKHOUSE(
    host 'localhost' port 9000 user 'default' password ''
    db 'auth' table 'user_tenants'
))
LAYOUT(HASHED())
LIFETIME(MIN 60 MAX 300);

-- Policy using dictGet for dynamic tenant lookup
CREATE ROW POLICY dynamic_tenant_policy ON events
FOR SELECT
USING tenant_id = dictGet('auth.user_tenant_map', 'tenant_id', currentUser())
TO ALL EXCEPT super_admin;
```

## Altering a Row Policy

```sql
-- Change the filter expression
ALTER ROW POLICY tenant_isolation ON events
USING tenant_id = dictGet('auth.user_tenant_map', 'tenant_id', currentUser());

-- Change assignment
ALTER ROW POLICY tenant_isolation ON events
TO ALL EXCEPT super_admin;
```

## Inspecting Row Policies

```sql
-- List all row policies
SHOW ROW POLICIES;

-- Policies on a specific table
SHOW ROW POLICIES ON analytics.events;

-- Show definition of a policy
SHOW CREATE ROW POLICY tenant_isolation ON analytics.events;

-- Query system table for details
SELECT
    name,
    database,
    table,
    is_restrictive,
    select_filter,
    apply_to_list
FROM system.row_policies;
```

## Dropping a Row Policy

```sql
DROP ROW POLICY IF EXISTS tenant_isolation ON analytics.events;

-- Drop multiple policies in one statement by listing them
DROP ROW POLICY IF EXISTS tenant_isolation, admin_full_access ON analytics.events;
```

## Summary

Row policies in ClickHouse implement transparent row-level security by appending filter expressions to queries at the server level. Permissive policies grant access to matching rows (combined with OR across multiple policies), while restrictive policies require rows to satisfy all conditions (combined with AND). The default-deny behavior - where any user without a matching policy sees no rows once any policy is defined - is the most important operational detail to internalize before deploying row policies in production. Use dictionaries for dynamic, data-driven row filters to support multi-tenant architectures without hardcoding tenant values in policy definitions.
