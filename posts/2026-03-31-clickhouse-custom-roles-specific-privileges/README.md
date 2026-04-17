# How to Create Custom Roles with Specific Privileges in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RBAC, Role, Privilege, Access Control, Security

Description: Learn how to design and create custom roles in ClickHouse with targeted privileges for different team personas like analysts, engineers, and operators.

---

Custom roles in ClickHouse let you define reusable permission sets that match the responsibilities of different team members. Rather than granting privileges directly to each user, roles make access control scalable and auditable.

## Planning Your Role Design

Start by identifying the personas in your organization and what they need:

| Role | Needs |
| --- | --- |
| analyst | SELECT on reporting tables |
| data_engineer | SELECT, INSERT on raw and staging tables |
| dashboard_app | SELECT on aggregated views |
| dba | CREATE, DROP, ALTER on all databases |
| auditor | SELECT on system tables |

## Creating Custom Roles

```sql
-- Analyst: read-only access to reporting database
CREATE ROLE analyst;
GRANT SELECT ON reporting_db.* TO analyst;

-- Data engineer: read/write on pipeline databases
CREATE ROLE data_engineer;
GRANT SELECT, INSERT ON raw_db.* TO data_engineer;
GRANT SELECT, INSERT, ALTER TABLE ON staging_db.* TO data_engineer;

-- Dashboard app: limited to pre-aggregated tables
CREATE ROLE dashboard_app;
GRANT SELECT ON reporting_db.daily_summary TO dashboard_app;
GRANT SELECT ON reporting_db.hourly_metrics TO dashboard_app;

-- DBA: full control
CREATE ROLE dba;
GRANT ALL ON *.* TO dba WITH GRANT OPTION;

-- Auditor: system table access
CREATE ROLE auditor;
GRANT SELECT ON system.query_log TO auditor;
GRANT SELECT ON system.users TO auditor;
GRANT SELECT ON system.grants TO auditor;
GRANT SELECT ON system.roles TO auditor;
```

## Assigning Roles to Users

```sql
CREATE USER alice IDENTIFIED WITH sha256_password BY 'AlicePass!';
GRANT analyst TO alice;
ALTER USER alice DEFAULT ROLE analyst;

CREATE USER bob IDENTIFIED WITH sha256_password BY 'BobPass!';
GRANT data_engineer TO bob;
ALTER USER bob DEFAULT ROLE data_engineer;
```

## Assigning Multiple Roles

A user can have multiple roles:

```sql
GRANT analyst TO alice;
GRANT auditor TO alice;
ALTER USER alice DEFAULT ROLE analyst, auditor;
```

## Role Hierarchy

Grant one role to another to build hierarchies:

```sql
CREATE ROLE senior_analyst;
-- Senior analysts can do everything analysts can, plus more
GRANT analyst TO senior_analyst;
GRANT SELECT ON raw_db.* TO senior_analyst;

GRANT senior_analyst TO charlie;
```

## Privilege Categories

ClickHouse supports these privilege types:

```sql
-- Data manipulation
GRANT SELECT, INSERT, ALTER DELETE, ALTER UPDATE ON db.table TO role_name;

-- Schema management
GRANT CREATE TABLE, DROP TABLE, ALTER TABLE ON db.* TO role_name;

-- Database management
GRANT CREATE DATABASE, DROP DATABASE ON *.* TO role_name;

-- User and role management
GRANT CREATE USER, ALTER USER, DROP USER ON *.* TO role_name;
GRANT CREATE ROLE, ALTER ROLE, DROP ROLE ON *.* TO role_name;

-- System operations
GRANT SYSTEM FLUSH LOGS ON *.* TO role_name;
GRANT SYSTEM RELOAD CONFIG ON *.* TO role_name;
```

## Viewing and Auditing Roles

```sql
-- List all roles
SHOW ROLES;

-- See grants for a role
SHOW GRANTS FOR analyst;

-- See all role assignments
SELECT user_name, granted_role_name
FROM system.role_grants
ORDER BY user_name;

-- See all privilege grants
SELECT user_name, role_name, access_type, database, table
FROM system.grants;
```

## Revoking and Modifying Roles

```sql
-- Remove a privilege from a role
REVOKE INSERT ON raw_db.* FROM data_engineer;

-- Remove a role from a user
REVOKE analyst FROM alice;

-- Drop a role (removes it from all users)
DROP ROLE dashboard_app;
```

## Summary

Custom roles in ClickHouse enable clean, maintainable access control by grouping privileges into reusable units. Design roles around job functions, use role hierarchies to avoid duplication, and audit assignments regularly through `system.grants` and `system.role_grants` to keep your security posture clean.
