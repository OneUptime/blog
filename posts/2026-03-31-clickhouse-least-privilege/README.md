# How to Implement Principle of Least Privilege in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Least Privilege, Access Control, Role

Description: Implement the principle of least privilege in ClickHouse by creating roles with minimal permissions, restricting database access, and auditing user grants.

---

The principle of least privilege means every user and service account should have only the permissions necessary to perform its function - nothing more. In ClickHouse, this is enforced through a combination of users, roles, row policies, and settings profiles.

## Creating Roles Instead of Granting Directly

Rather than granting permissions directly to users, create roles that encapsulate permission sets:

```sql
-- Read-only analytics role
CREATE ROLE analytics_reader;
GRANT SELECT ON analytics.* TO analytics_reader;

-- ETL writer role
CREATE ROLE etl_writer;
GRANT INSERT ON events.* TO etl_writer;
GRANT SELECT ON events.* TO etl_writer;

-- Schema admin role
CREATE ROLE schema_admin;
GRANT CREATE TABLE, DROP TABLE, ALTER ON mydb.* TO schema_admin;
```

## Assigning Roles to Users

```sql
CREATE USER analyst1 IDENTIFIED WITH sha256_password BY 'SecurePass!1'
    HOST IP '10.0.0.0/8';

GRANT analytics_reader TO analyst1;

-- Service accounts get minimal roles
CREATE USER etl_service IDENTIFIED WITH sha256_password BY 'ServicePass!1'
    HOST IP '10.0.1.0/24';

GRANT etl_writer TO etl_service;
```

## Restricting to Specific Tables

For even finer control, grant permissions only on specific tables:

```sql
CREATE ROLE dashboard_role;
GRANT SELECT ON analytics.page_views TO dashboard_role;
GRANT SELECT ON analytics.sessions TO dashboard_role;
-- NOT granted: analytics.user_pii, analytics.payments
```

## Row-Level Security

Restrict which rows a user can see:

```sql
CREATE ROW POLICY tenant_isolation ON events
    FOR SELECT USING tenant_id = currentUser()
    TO tenant_user_1, tenant_user_2;
```

This prevents users from seeing rows that don't belong to their tenant, even if they have SELECT on the table.

## Column-Level Access Control

```sql
-- Grant SELECT only on non-sensitive columns
GRANT SELECT(event_time, event_type, page_url, session_id)
    ON analytics.events TO analytics_reader;
-- email, user_id columns are not accessible
```

## Auditing Current Permissions

```sql
-- Show all grants for a specific user
SHOW GRANTS FOR analyst1;

-- See all users and their default roles
SELECT name, default_roles_all, default_roles_list
FROM system.users
ORDER BY name;

-- See all role grants
SELECT user_name, role_name, granted_role_name, with_admin_option
FROM system.role_grants
ORDER BY user_name, role_name, granted_role_name;
```

## Revoking Unnecessary Permissions

```sql
-- Revoke a specific grant
REVOKE SELECT ON analytics.user_pii FROM analytics_reader;

-- Revoke a role
REVOKE analytics_reader FROM analyst1;

-- Drop unused roles
DROP ROLE IF EXISTS old_readonly_role;
```

## Restricting Settings for Service Accounts

Pair least-privilege access with resource constraints:

```sql
CREATE SETTINGS PROFILE etl_limits
    CONSTRAINTS
        max_memory_usage MAX 4294967296,
        max_execution_time MAX 3600,
        max_rows_to_read MAX 5000000000;

ALTER USER etl_service SETTINGS PROFILE etl_limits;
```

## Quarterly Access Review Query

```sql
SELECT
    u.name AS username,
    u.auth_type AS auth_types,
    groupArray(gr.granted_role_name) AS roles,
    u.host_ip AS allowed_ips
FROM system.users u
LEFT JOIN system.role_grants gr ON u.name = gr.user_name
GROUP BY username, auth_types, allowed_ips
ORDER BY username;
```

Run this quarterly and remove or reduce permissions for inactive users or service accounts.

## Summary

Least privilege in ClickHouse is implemented through roles, table and column grants, row policies, and settings profiles. Create purpose-specific roles rather than granting directly to users, apply row policies for multi-tenant isolation, and conduct regular permission audits. This limits blast radius when credentials are compromised and ensures compliance with data governance requirements.
