# How to Use CREATE ROLE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, Security, Access Control, Privilege

Description: Learn how to use the CREATE ROLE statement in MySQL 8.0 to define reusable privilege sets that simplify user access management.

---

## What Is a MySQL Role

A role in MySQL is a named collection of privileges that can be granted to users. Instead of granting individual privileges to each user, you define a role with the required privileges and then assign the role to users. This simplifies access management, especially in large teams, and makes it easy to apply consistent permission sets across multiple accounts.

Roles were introduced in MySQL 8.0.

## Creating a Role

```sql
CREATE ROLE 'app_reader';
CREATE ROLE 'app_writer';
CREATE ROLE 'app_admin';
```

You can create multiple roles in one statement:

```sql
CREATE ROLE 'read_only', 'read_write', 'schema_admin';
```

## Granting Privileges to a Role

Once created, grant privileges to the role as you would to a user:

```sql
-- Read-only role
GRANT SELECT ON mydb.* TO 'app_reader';

-- Read-write role
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_writer';

-- Admin role with schema control
GRANT ALL PRIVILEGES ON mydb.* TO 'app_admin';
```

## Granting a Role to a User

```sql
-- Create users
CREATE USER 'alice'@'%' IDENTIFIED BY 'strongpassword';
CREATE USER 'bob'@'%' IDENTIFIED BY 'strongpassword';

-- Grant roles
GRANT 'app_reader' TO 'alice'@'%';
GRANT 'app_writer' TO 'bob'@'%';
```

A user can have multiple roles:

```sql
GRANT 'app_reader', 'app_writer' TO 'bob'@'%';
```

## Activating Roles in a Session

By default, granted roles are not automatically active. Users must activate them:

```sql
-- Activate a role for the current session
SET ROLE 'app_reader';

-- Activate all granted roles
SET ROLE ALL;

-- Deactivate all roles
SET ROLE NONE;

-- Check active roles
SELECT CURRENT_ROLE();
```

## Setting Default Active Roles

To automatically activate roles when a user logs in, use `SET DEFAULT ROLE`:

```sql
SET DEFAULT ROLE 'app_reader' TO 'alice'@'%';
SET DEFAULT ROLE ALL TO 'bob'@'%';
```

Alternatively, configure the global default:

```sql
SET GLOBAL activate_all_roles_on_login = ON;
```

## Role Hierarchy - Roles Granting Roles

Roles can be granted to other roles, creating a hierarchy:

```sql
-- Create a composite role
CREATE ROLE 'app_superuser';

-- Grant existing roles to the new role
GRANT 'app_reader', 'app_writer' TO 'app_superuser';

-- Grant the composite role to a user
GRANT 'app_superuser' TO 'carol'@'%';
```

## Viewing Roles and Privileges

```sql
-- Inspect a role's grants
SHOW GRANTS FOR 'app_reader';

-- See which roles are granted to users
SELECT FROM_USER AS role_name, TO_USER AS user_name, TO_HOST AS host
FROM mysql.role_edges
ORDER BY role_name, user_name, host;

-- Show all grants for a user including role privileges
SHOW GRANTS FOR 'alice'@'%' USING 'app_reader';

-- List default roles assigned to users
SELECT USER, HOST, DEFAULT_ROLE_USER AS role_name, DEFAULT_ROLE_HOST AS role_host
FROM mysql.default_roles;
```

## Revoking Roles and Dropping Roles

```sql
-- Revoke a role from a user
REVOKE 'app_reader' FROM 'alice'@'%';

-- Drop a role entirely
DROP ROLE IF EXISTS 'app_reader';
```

Dropping a role automatically revokes it from all users who had it.

## Practical Example - Application Access Control

```sql
-- Roles
CREATE ROLE 'analytics_read', 'data_write', 'dba_full';

-- Analytics read - SELECT on reporting tables only
GRANT SELECT ON analytics.* TO 'analytics_read';

-- Data write - INSERT/UPDATE on operational tables
GRANT INSERT, UPDATE, SELECT ON app.orders TO 'data_write';
GRANT INSERT, UPDATE, SELECT ON app.customers TO 'data_write';

-- DBA full access
GRANT ALL ON *.* TO 'dba_full' WITH GRANT OPTION;

-- Assign to users
CREATE USER 'analyst1'@'%' IDENTIFIED BY 'pass1';
GRANT 'analytics_read' TO 'analyst1'@'%';
SET DEFAULT ROLE ALL TO 'analyst1'@'%';

CREATE USER 'appservice'@'10.0.0.%' IDENTIFIED BY 'pass2';
GRANT 'analytics_read', 'data_write' TO 'appservice'@'10.0.0.%';
SET DEFAULT ROLE ALL TO 'appservice'@'10.0.0.%';
```

## Summary

The `CREATE ROLE` statement in MySQL 8.0 simplifies access management by grouping privileges into reusable named roles. Assign roles to users instead of individual privileges, use role hierarchies for composite access patterns, and configure default roles so users do not need to activate them manually. Roles make it much easier to audit and manage permissions across large teams and applications.
