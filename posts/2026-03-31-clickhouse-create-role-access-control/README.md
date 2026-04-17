# How to Create a Role in ClickHouse for Access Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Security, Role, Access Control, RBAC

Description: Learn how to create roles in ClickHouse, grant privileges and roles to users, build role hierarchies, and implement RBAC with practical examples.

---

Role-Based Access Control (RBAC) in ClickHouse lets you define named sets of privileges and assign them to users. Rather than granting individual privileges to each user - which becomes unmanageable at scale - you create roles representing job functions (analyst, writer, admin) and grant those roles to users. ClickHouse implements a full RBAC model: roles can inherit from other roles, privileges can be granted with or without the ability to re-grant them, and role membership can be administered through SQL.

## Basic CREATE ROLE Syntax

```sql
CREATE ROLE [IF NOT EXISTS | OR REPLACE] role_name
[ON CLUSTER cluster_name]
[SETTINGS setting = value [MIN min] [MAX max] [READONLY | WRITABLE], ...];
```

Create a simple role:

```sql
CREATE ROLE IF NOT EXISTS analyst;
CREATE ROLE IF NOT EXISTS writer;
CREATE ROLE IF NOT EXISTS admin;
```

## Granting Privileges to a Role

Use `GRANT` to assign database privileges to a role:

### SELECT Privileges

```sql
-- Grant SELECT on a specific table
GRANT SELECT ON analytics.events TO analyst;

-- Grant SELECT on all tables in a database
GRANT SELECT ON analytics.* TO analyst;

-- Grant SELECT on all databases
GRANT SELECT ON *.* TO analyst;
```

### INSERT Privileges

```sql
GRANT INSERT ON analytics.events TO writer;
GRANT INSERT ON analytics.* TO writer;
```

### DDL Privileges

```sql
-- Allow creating and dropping tables in a specific database
GRANT CREATE TABLE, DROP TABLE ON staging.* TO writer;

-- Allow creating views
GRANT CREATE VIEW ON analytics.* TO analyst;
```

### Admin Privileges

```sql
-- Full access on everything
GRANT ALL ON *.* TO admin;

-- Full access on a single database
GRANT ALL ON analytics.* TO db_admin;
```

### System Privileges

```sql
GRANT SYSTEM RELOAD DICTIONARY ON *.* TO analyst;
GRANT SYSTEM FLUSH LOGS ON *.* TO admin;
GRANT KILL QUERY ON *.* TO admin;
```

## Granting a Role to a User

```sql
-- Grant a single role
GRANT analyst TO alice;

-- Grant multiple roles
GRANT analyst, writer TO bob;

-- Grant WITH ADMIN OPTION (user can grant this role to others)
GRANT analyst TO alice WITH ADMIN OPTION;
```

## Role Hierarchies - Roles Granting Roles

ClickHouse supports role inheritance. A role can include another role, so its members automatically get the parent role's privileges:

```sql
-- Base roles
CREATE ROLE readonly_base;
GRANT SELECT ON analytics.* TO readonly_base;

-- Extended role that inherits from readonly_base
CREATE ROLE analyst;
GRANT readonly_base TO analyst;
GRANT CREATE VIEW ON analytics.* TO analyst;

-- Power user role that inherits from analyst
CREATE ROLE senior_analyst;
GRANT analyst TO senior_analyst;
GRANT INSERT ON analytics.staging TO senior_analyst;
GRANT DROP TABLE ON analytics.staging TO senior_analyst;

-- Assign to a user - they get all privileges from senior_analyst, analyst, and readonly_base
GRANT senior_analyst TO carol;
```

## Setting Active Roles

A user may have multiple roles. By default, all granted roles are active. A user can activate a subset for their session:

```sql
-- Set specific active roles for current session
SET ROLE analyst;

-- Activate all granted roles
SET ROLE ALL;

-- Deactivate all roles (revert to no-role permissions)
SET ROLE NONE;

-- Activate all roles except one
SET ROLE ALL EXCEPT admin;
```

## Default Roles on Login

Set which roles are active by default when a user logs in:

```sql
-- When creating the user
CREATE USER diana IDENTIFIED BY 'password' DEFAULT ROLE analyst;

-- Update default roles for an existing user
ALTER USER diana DEFAULT ROLE analyst, reader;

-- All granted roles are active by default
ALTER USER diana DEFAULT ROLE ALL;

-- No roles active by default (user must SET ROLE manually)
ALTER USER diana DEFAULT ROLE NONE;
```

## Practical RBAC Example

Here is a complete example for an analytics platform with three access tiers:

```sql
-- Create roles
CREATE ROLE IF NOT EXISTS dashboard_viewer;
CREATE ROLE IF NOT EXISTS data_engineer;
CREATE ROLE IF NOT EXISTS data_admin;

-- dashboard_viewer: read-only on marts (aggregated data)
GRANT SELECT ON marts.* TO dashboard_viewer;

-- data_engineer: read raw data, write to staging, manage views in warehouse
GRANT SELECT ON raw.* TO data_engineer;
GRANT SELECT ON warehouse.* TO data_engineer;
GRANT INSERT ON staging.* TO data_engineer;
GRANT CREATE TABLE, DROP TABLE ON staging.* TO data_engineer;
GRANT CREATE VIEW, DROP VIEW ON warehouse.* TO data_engineer;
GRANT SELECT ON marts.* TO data_engineer;  -- can also read dashboard data

-- data_admin: inherits data_engineer, plus full DDL on all layers
GRANT data_engineer TO data_admin;
GRANT ALL ON raw.* TO data_admin;
GRANT ALL ON warehouse.* TO data_admin;
GRANT ALL ON marts.* TO data_admin;
GRANT SYSTEM RELOAD DICTIONARY ON *.* TO data_admin;

-- Assign to users
CREATE USER IF NOT EXISTS analyst_alice IDENTIFIED BY 'password123' DEFAULT ROLE dashboard_viewer;
CREATE USER IF NOT EXISTS engineer_bob IDENTIFIED BY 'password456' DEFAULT ROLE data_engineer;
CREATE USER IF NOT EXISTS admin_carol  IDENTIFIED BY 'password789' DEFAULT ROLE data_admin;
```

## Revoking Privileges and Roles

```sql
-- Revoke a privilege from a role
REVOKE SELECT ON analytics.events FROM analyst;

-- Revoke a role from a user
REVOKE analyst FROM alice;

-- Revoke all privileges from a role
REVOKE ALL ON *.* FROM analyst;
```

## Inspecting Roles and Grants

```sql
-- List all roles
SHOW ROLES;

-- Show grants for a specific role
SHOW GRANTS FOR analyst;

-- Show current user's grants
SHOW GRANTS;

-- Detailed role information
SELECT name FROM system.roles;

-- Role membership
SELECT
    user_name,
    role_name,
    granted_role_name,
    granted_role_is_default
FROM system.role_grants;

-- All grants
SELECT
    user_name,
    role_name,
    access_type,
    database,
    table
FROM system.grants;
```

## Dropping a Role

```sql
DROP ROLE IF EXISTS analyst;
```

Dropping a role automatically revokes it from all users and removes it from any role hierarchies.

## Summary

ClickHouse's RBAC model lets you define roles with fine-grained database privileges, build role hierarchies through role-to-role grants, and assign roles to users with optional re-grant authority. Centralizing privilege definitions in roles rather than individual user grants dramatically simplifies access management as teams and schemas grow. Use `SHOW GRANTS FOR role_name` and the `system.grants` table to audit the current permission state of your cluster.
