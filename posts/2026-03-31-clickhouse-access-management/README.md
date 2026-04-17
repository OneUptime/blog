# How to Configure access_management in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Access Control, Configuration, SQL, User Management

Description: Learn how to enable and use access_management in ClickHouse to manage users, roles, and privileges via SQL statements instead of XML configuration files.

---

## Introduction

ClickHouse has two user management modes. The legacy mode uses `users.xml` files. The modern mode, enabled by `access_management = 1`, lets administrators create users, roles, and grant privileges using SQL DDL statements. SQL-driven access management is stored in ClickHouse's own access control directory and supports roles, row policies, quotas, and settings profiles -- all without editing XML files.

## Enabling access_management

In `users.xml`, grant `access_management` to the admin user:

```xml
<users>
  <admin>
    <password_sha256_hex>HASH_OF_ADMIN_PASSWORD</password_sha256_hex>
    <networks>
      <ip>127.0.0.1</ip>
      <ip>10.0.0.0/8</ip>
    </networks>
    <profile>default</profile>
    <quota>default</quota>
    <access_management>1</access_management>
  </admin>
</users>
```

## Storage Location

SQL-managed access control objects are stored on disk as flat `.sql` files named by UUID, along with index files like `users.list`, `roles.list`, `quotas.list`, `row_policies.list`, and `settings_profiles.list`:

```bash
ls /var/lib/clickhouse/access/
# 3843f510-6ebd-a52d-72ac-e021686d8a93.sql
# users.list   roles.list   quotas.list   row_policies.list   settings_profiles.list
```

## Creating Users via SQL

```sql
-- Create a user with SHA256 password
CREATE USER analyst
    IDENTIFIED WITH sha256_password BY 'SecurePassword123!'
    HOST IP '10.0.0.0/8'
    SETTINGS PROFILE 'analytics';

-- Create a user with plaintext (development only)
CREATE USER dev_user IDENTIFIED BY 'devpass';

-- Create a user with no password (for internal service accounts)
CREATE USER internal_service IDENTIFIED WITH no_password HOST LOCAL;
```

## Listing Users

```sql
SELECT name, storage, host_ip, host_names
FROM system.users;
```

## Creating Roles

```sql
CREATE ROLE analyst_role;
CREATE ROLE readonly_role;
CREATE ROLE etl_role;
```

## Granting Privileges to Roles

```sql
-- Grant SELECT on a specific database
GRANT SELECT ON analytics.* TO analyst_role;

-- Grant INSERT on a specific table
GRANT INSERT ON raw_data.events TO etl_role;

-- Grant read-only on all databases
GRANT SELECT ON *.* TO readonly_role;

-- Grant SHOW TABLES and SHOW DATABASES
GRANT SHOW ON *.* TO readonly_role;
```

## Assigning Roles to Users

```sql
GRANT analyst_role TO analyst;
GRANT readonly_role TO readonly_user;
GRANT etl_role TO etl_service;
```

## Setting a Default Role

```sql
ALTER USER analyst DEFAULT ROLE analyst_role;
```

## Revoking Privileges

```sql
-- Revoke a specific privilege
REVOKE INSERT ON raw_data.events FROM etl_role;

-- Revoke a role from a user
REVOKE analyst_role FROM analyst;
```

## Creating Settings Profiles via SQL

```sql
CREATE SETTINGS PROFILE analytics_profile
    SETTINGS
        max_memory_usage = 20000000000,
        max_threads = 16,
        use_query_cache = 1,
        query_cache_ttl = 60;

ALTER USER analyst SETTINGS PROFILE 'analytics_profile';
```

## Creating Quotas via SQL

```sql
CREATE QUOTA hourly_quota
    FOR INTERVAL 1 hour
        MAX queries = 1000, read_rows = 10000000000, execution_time = 3600
    TO analyst;
```

## Creating Row Policies via SQL

```sql
-- Users can only see their own tenant's data
CREATE ROW POLICY tenant_isolation
    ON events
    FOR SELECT
    USING tenant_id = currentUser()
    TO analyst_role;
```

## Viewing Grants

```sql
-- Show grants for a user
SHOW GRANTS FOR analyst;

-- Show current user's grants
SHOW GRANTS;

-- List all roles
SHOW ROLES;
```

## Deleting Users and Roles

```sql
DROP USER IF EXISTS analyst;
DROP ROLE IF EXISTS analyst_role;
DROP QUOTA IF EXISTS hourly_quota;
DROP SETTINGS PROFILE IF EXISTS analytics_profile;
```

## Migrating from users.xml to SQL Access Management

1. Enable `access_management = 1` on the admin user in `users.xml`.
2. Connect as admin and recreate users and roles using SQL.
3. Test that new SQL-managed users work correctly.
4. Remove the old user definitions from `users.xml` (keep admin).

## Summary

Setting `access_management = 1` on an admin user in `users.xml` unlocks SQL-driven user management in ClickHouse. Administrators can then use `CREATE USER`, `CREATE ROLE`, `GRANT`, `REVOKE`, `CREATE QUOTA`, and `CREATE ROW POLICY` statements to manage access control without editing XML files. SQL-managed objects are stored in `/var/lib/clickhouse/access/` and survive config reloads and restarts.
