# How to Create Users and Roles in ClickHouse with SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, SQL, Database, Administration, Access Control

Description: Learn how to create and manage users and roles in ClickHouse using SQL statements, set passwords, restrict host access, and assign granular privileges.

---

ClickHouse provides a complete SQL interface for user and role management. You can create users, set authentication methods, restrict network access, assign roles, and grant or revoke privileges - all without touching configuration files. This makes ClickHouse access control familiar to anyone who has managed users in PostgreSQL or MySQL.

## Prerequisites

Connect to ClickHouse as a user with `ACCESS MANAGEMENT` privilege. By default the `default` user has this privilege on fresh installations.

## Creating Users

### Password Authentication

```sql
-- SHA-256 hashed password (recommended)
CREATE USER alice
    IDENTIFIED WITH sha256_password BY 'SecurePass123!';

-- bcrypt password (stronger but slower to verify)
CREATE USER bob
    IDENTIFIED WITH bcrypt_password BY 'AnotherPass456!';

-- Double SHA-1 for compatibility with older MySQL clients
CREATE USER legacy_app
    IDENTIFIED WITH double_sha1_password BY 'LegacyPass789!';
```

### No Password (Internal Use Only)

```sql
CREATE USER monitoring_agent
    IDENTIFIED WITH no_password;
```

Use this only for trusted internal agents connecting from a restricted IP range.

### Changing a User's Password

```sql
ALTER USER alice
    IDENTIFIED WITH sha256_password BY 'NewPassword999!';
```

## Restricting Host Access

By default a new user can connect from any host. Restrict this using `HOST`:

```sql
-- Allow from a specific IP address
CREATE USER alice
    IDENTIFIED WITH sha256_password BY 'SecurePass123!'
    HOST IP '192.168.1.50';

-- Allow from a CIDR range
CREATE USER api_service
    IDENTIFIED WITH sha256_password BY 'ApiPass111!'
    HOST IP '10.0.0.0/8';

-- Allow from specific hostnames (resolved at connect time)
CREATE USER dba
    IDENTIFIED WITH sha256_password BY 'DbaPass222!'
    HOST NAME 'dba-workstation.internal';

-- Allow from localhost only
CREATE USER local_only
    IDENTIFIED WITH sha256_password BY 'LocalPass333!'
    HOST LOCAL;

-- Allow from any host (explicit)
CREATE USER public_reader
    IDENTIFIED WITH sha256_password BY 'PubPass444!'
    HOST ANY;
```

## Setting a Default Database

```sql
CREATE USER app_user
    IDENTIFIED WITH sha256_password BY 'AppPass555!'
    DEFAULT DATABASE app_db;
```

The user's session starts in `app_db` without needing `USE app_db`.

## Creating Roles

Roles are named sets of privileges that can be assigned to users:

```sql
-- Roles for a typical web application
CREATE ROLE readonly;
CREATE ROLE readwrite;
CREATE ROLE developer;
CREATE ROLE admin;
```

## Granting Privileges to Roles

```sql
-- readonly: can only SELECT
GRANT SELECT ON app_db.* TO readonly;

-- readwrite: SELECT and INSERT
GRANT SELECT, INSERT ON app_db.* TO readwrite;

-- developer: DML + DDL
GRANT SELECT, INSERT, ALTER, CREATE TABLE, DROP TABLE ON app_db.* TO developer;

-- admin: everything on app_db
GRANT ALL ON app_db.* TO admin;
```

Grant privileges on specific tables:

```sql
GRANT SELECT ON app_db.products TO readonly;
GRANT SELECT, INSERT ON app_db.orders TO readwrite;
```

## Assigning Roles to Users

```sql
-- Assign one role
GRANT readonly TO alice;

-- Assign multiple roles
GRANT readwrite, developer TO bob;

-- Assign with admin option (bob can grant the role to others)
GRANT developer TO bob WITH ADMIN OPTION;
```

## Setting a Default Role

The default role activates automatically on login:

```sql
ALTER USER alice DEFAULT ROLE readonly;
ALTER USER bob DEFAULT ROLE readwrite;
```

Set multiple default roles:

```sql
ALTER USER bob DEFAULT ROLE readwrite, developer;
```

## Activating Roles in a Session

A user can switch roles during a session:

```sql
-- Show currently active roles
SELECT currentRoles();

-- Activate a specific role (if granted)
SET ROLE developer;

-- Activate all granted roles
SET ROLE ALL;

-- Deactivate all roles
SET ROLE NONE;
```

## Viewing Users and Roles

```sql
-- List all users
SELECT name, host_ip, host_names, default_roles_list, default_database
FROM system.users
ORDER BY name;

-- List all roles
SELECT name
FROM system.roles
ORDER BY name;

-- See all role grants
SELECT granted_role_name, user_name, role_name, with_admin_option
FROM system.role_grants
ORDER BY user_name;

-- See privilege grants
SELECT user_name, role_name, access_type, database, table, column, is_partial_revoke
FROM system.grants
ORDER BY user_name, role_name, access_type;

-- Show grants for a specific user
SHOW GRANTS FOR alice;
```

## Revoking Roles and Privileges

```sql
-- Revoke a role from a user
REVOKE readonly FROM alice;

-- Revoke a privilege from a role
REVOKE INSERT ON app_db.orders FROM readwrite;

-- Revoke all privileges from a role on a database
REVOKE ALL ON app_db.* FROM developer;
```

## Dropping Users and Roles

```sql
DROP USER IF EXISTS alice;
DROP USER IF EXISTS bob;
DROP ROLE IF EXISTS readonly;
DROP ROLE IF EXISTS readwrite;
```

## Complete Example: Bootstrapping a New Application

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS myapp;

-- Create roles
CREATE ROLE myapp_reader;
CREATE ROLE myapp_writer;

-- Grant privileges
GRANT SELECT ON myapp.* TO myapp_reader;
GRANT SELECT, INSERT ON myapp.* TO myapp_writer;

-- Create users
CREATE USER myapp_api
    IDENTIFIED WITH sha256_password BY 'ApiSecret123!'
    HOST IP '10.10.0.0/16'
    DEFAULT DATABASE myapp;

CREATE USER myapp_analyst
    IDENTIFIED WITH sha256_password BY 'AnalystPass456!'
    HOST IP '10.10.0.0/16'
    DEFAULT DATABASE myapp;

-- Assign roles
GRANT myapp_writer TO myapp_api;
GRANT myapp_reader TO myapp_analyst;

-- Set defaults
ALTER USER myapp_api DEFAULT ROLE myapp_writer;
ALTER USER myapp_analyst DEFAULT ROLE myapp_reader;

-- Verify
SHOW GRANTS FOR myapp_api;
SHOW GRANTS FOR myapp_analyst;
```

## Summary

ClickHouse's SQL user management gives you fine-grained control over authentication, network access, and permissions. Create users with `CREATE USER`, define permission bundles with `CREATE ROLE`, and use `GRANT` to link them together. Query `system.users`, `system.roles`, and `system.grants` to audit the current state. Roles make it easy to apply consistent permissions across many users and change them in one place.
