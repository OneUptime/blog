# How to Set Up Database-Level Access Control in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Database, Infrastructure, SQL

Description: Learn how to configure ClickHouse SQL-based access control with users, roles, row policies, and quotas to enforce least-privilege access at the database level.

---

## Introduction

ClickHouse supports a full SQL-based access control system that lets you define users, roles, privileges, row-level policies, and resource quotas. This system, introduced in ClickHouse 20.4 and significantly improved in subsequent releases, replaces the older XML-based user configuration and is now the recommended approach for production deployments.

This guide walks through creating a complete access control hierarchy: from creating users and roles to applying row-level policies and enforcing per-user query quotas.

## Enable SQL-Based Access Control

Before using SQL-based access control, ensure the `access_management` flag is enabled for the initial admin user in the ClickHouse configuration.

```xml
<!-- /etc/clickhouse-server/users.xml -->
<users>
    <admin>
        <password>your-admin-password</password>
        <networks>
            <ip>::/0</ip>
        </networks>
        <access_management>1</access_management>
        <named_collection_control>1</named_collection_control>
    </admin>
</users>
```

After enabling, log in as the admin user and manage everything via SQL.

## Creating Users

```sql
-- Create a user with a SHA256-hashed password
CREATE USER analyst_alice
    IDENTIFIED WITH sha256_password BY 'StrongPassword123!'
    HOST IP '10.0.0.0/8';

-- Create a user allowed from any host (development only)
CREATE USER dev_bob
    IDENTIFIED WITH sha256_password BY 'AnotherPassword456!'
    HOST ANY;

-- Create a service account with bcrypt
CREATE USER service_etl
    IDENTIFIED WITH bcrypt_password BY 'ServicePassword789!'
    HOST IP '10.1.2.3';

-- View all users
SELECT name, auth_type, host_ip, host_names
FROM system.users;
```

## Creating Roles

Roles group privileges so you can assign consistent access to multiple users without repeating GRANT statements.

```sql
-- Read-only analyst role
CREATE ROLE analyst;

-- ETL service role with write access to specific tables
CREATE ROLE etl_writer;

-- Database administrator role
CREATE ROLE db_admin;

-- View all roles
SELECT name FROM system.roles;
```

## Granting Privileges to Roles

```sql
-- Grant SELECT on all tables in the analytics database to analysts
GRANT SELECT ON analytics.* TO analyst;

-- Grant SELECT on specific tables only
GRANT SELECT ON analytics.events TO analyst;
GRANT SELECT ON analytics.metrics TO analyst;

-- Grant INSERT on specific tables to the ETL writer
GRANT INSERT ON analytics.raw_events TO etl_writer;
GRANT INSERT ON analytics.raw_metrics TO etl_writer;

-- Grant full control on a specific database to the admin role
GRANT ALL ON analytics.* TO db_admin;

-- Grant CREATE TABLE permission
GRANT CREATE TABLE ON analytics.* TO db_admin;

-- Grant the ability to manage users (for DBA use)
GRANT ACCESS MANAGEMENT ON *.* TO db_admin;
```

## Assigning Roles to Users

```sql
-- Assign roles to users
GRANT analyst TO analyst_alice;
GRANT etl_writer TO service_etl;
GRANT analyst, db_admin TO dev_bob;

-- Set a default role (active on login without SET ROLE)
SET DEFAULT ROLE analyst TO analyst_alice;
SET DEFAULT ROLE etl_writer TO service_etl;

-- View role assignments
SELECT user_name, granted_role_name
FROM system.role_grants
ORDER BY user_name;
```

## Viewing Effective Privileges

```sql
-- Show privileges for a specific user
SHOW GRANTS FOR analyst_alice;

-- Show current user's grants
SHOW GRANTS;

-- Detailed privilege view
SELECT
    user_name,
    role_name,
    access_type,
    database,
    table,
    column,
    grant_option
FROM system.grants
WHERE user_name = 'analyst_alice'
   OR role_name IN (
       SELECT role_name FROM system.role_grants WHERE user_name = 'analyst_alice'
   )
ORDER BY database, table;
```

## Row-Level Security Policies

Row policies restrict which rows a user or role can see, effectively adding a WHERE clause to every query that role runs against the table.

```sql
-- Allow analysts to see only rows from their assigned region
CREATE ROW POLICY analyst_region_policy ON analytics.events
    FOR SELECT
    USING region = dictGet('user_region_dict', 'region', currentUser())
    TO analyst;

-- Allow each user to see only their own data
CREATE ROW POLICY own_data_policy ON analytics.user_profiles
    FOR SELECT
    USING user_id = toUInt64(currentUser())
    TO analyst;

-- Allow the admin role to see all rows
CREATE ROW POLICY admin_all_rows ON analytics.events
    FOR SELECT
    USING 1 = 1
    TO db_admin;
```

View existing row policies:

```sql
SELECT short_name, database, table, select_filter, apply_to_list
FROM system.row_policies;
```

## Quotas

Quotas limit how much compute and data a user or role can consume over a time window.

```sql
-- Max 1000 queries and 100 GB read per hour
CREATE QUOTA analyst_quota
    FOR INTERVAL 1 HOUR MAX queries = 1000, read_bytes = 100000000000
    FOR INTERVAL 1 DAY  MAX queries = 10000, read_bytes = 1000000000000
    TO analyst;

-- Stricter quota for development users
CREATE QUOTA dev_quota
    FOR INTERVAL 1 HOUR MAX queries = 100, read_bytes = 10000000000
    FOR INTERVAL 1 DAY  MAX queries = 500
    TO dev_bob;

-- View quota consumption across all users
SELECT
    quota_name,
    quota_key,
    duration,
    queries,
    read_bytes,
    formatReadableSize(read_bytes) AS readable_bytes
FROM system.quotas_usage;
```

## Restricting Query Complexity

Use settings profiles to cap memory and execution time at the role level.

```sql
-- Create a profile with resource limits for analysts
CREATE SETTINGS PROFILE analyst_profile
    SETTINGS
        max_memory_usage      = 10000000000,
        max_execution_time    = 300,
        max_rows_to_read      = 1000000000,
        readonly              = 1
    TO analyst;

-- Write profile for ETL
CREATE SETTINGS PROFILE etl_profile
    SETTINGS
        max_memory_usage     = 20000000000,
        max_execution_time   = 3600,
        max_insert_block_size = 1000000
    TO etl_writer;
```

## Revoking Access

```sql
-- Revoke a specific privilege from a role
REVOKE SELECT ON analytics.sensitive_table FROM analyst;

-- Revoke a role from a user
REVOKE analyst FROM analyst_alice;

-- Drop a user
DROP USER dev_bob;

-- Drop a role (also removes all grants for that role)
DROP ROLE analyst;

-- Drop a row policy
DROP ROW POLICY analyst_region_policy ON analytics.events;
```

## Auditing Access

```sql
-- Recent login attempts
SELECT
    event_time,
    user,
    client_hostname,
    exception
FROM system.query_log
WHERE type IN ('ExceptionBeforeStart', 'QueryStart')
  AND event_time >= now() - INTERVAL 1 DAY
ORDER BY event_time DESC
LIMIT 50;

-- Top users by data read
SELECT
    user,
    count()                              AS query_count,
    formatReadableSize(sum(read_bytes))  AS total_data_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 DAY
GROUP BY user
ORDER BY sum(read_bytes) DESC
LIMIT 10;
```

## Summary

ClickHouse's SQL-based access control provides a complete least-privilege framework: create users with network restrictions and strong passwords, assign roles that group related privileges, apply row-level policies for data partitioning, enforce quotas to protect cluster resources, and use settings profiles to cap per-query resource consumption. This layered model lets you expose the same ClickHouse cluster safely to analysts, ETL pipelines, and external applications with appropriate constraints on each.
