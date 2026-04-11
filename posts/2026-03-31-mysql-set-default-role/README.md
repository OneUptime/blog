# How to Use SET DEFAULT ROLE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, Security

Description: Learn how to use SET DEFAULT ROLE in MySQL to configure which roles automatically activate when a user logs in, simplifying session setup.

---

## What Is SET DEFAULT ROLE

In MySQL's role-based access control system, roles assigned to users are not active by default when they log in. `SET DEFAULT ROLE` configures which roles should automatically activate at the start of each session for a user. Without default roles configured, users must manually run `SET ROLE` each session to activate their privileges.

```sql
SET DEFAULT ROLE role_name TO user_account;
```

## Basic Syntax

```sql
-- Set a single default role for a user
SET DEFAULT ROLE 'app_reader' TO 'alice'@'%';

-- Set multiple default roles
SET DEFAULT ROLE 'app_reader', 'reporting_viewer' TO 'alice'@'%';

-- Set all assigned roles as defaults
SET DEFAULT ROLE ALL TO 'alice'@'%';

-- Remove all default roles
SET DEFAULT ROLE NONE TO 'alice'@'%';
```

## Setting Default Roles for Multiple Users

You can configure default roles for several users in one statement:

```sql
SET DEFAULT ROLE 'app_reader'
  TO 'alice'@'%', 'bob'@'%', 'carol'@'%';
```

## Verifying Default Role Configuration

```sql
-- Check default roles for a user
SELECT User, Host, default_role_user, default_role_host
FROM mysql.default_roles
WHERE User = 'alice';
```

Alternatively, use `SHOW CREATE USER`:

```sql
SHOW CREATE USER 'alice'@'%';
```

The output includes the account definition, including any default-role configuration. If you need the assigned defaults directly, query `mysql.default_roles` as above.

## Effect at Login

When `alice` logs in after `SET DEFAULT ROLE 'app_reader' TO 'alice'@'%'` is run, the `app_reader` role is immediately active:

```sql
-- alice logs in and immediately sees:
SELECT CURRENT_ROLE();
-- Returns: `app_reader`@`%`
```

Without default roles, `CURRENT_ROLE()` would return `NONE` after login.

## Server-Wide Automatic Activation

As an alternative to configuring default roles per user, you can enable automatic activation of all roles for all users at the server level:

```sql
SET GLOBAL activate_all_roles_on_login = ON;
```

With this setting, every user automatically gets all their assigned roles activated on login. This is simpler but less fine-grained than per-user default roles.

## Practical Setup Example

Here is a complete role setup workflow:

```sql
-- Create roles
CREATE ROLE 'analyst_read', 'analyst_write';

-- Grant privileges to roles
GRANT SELECT ON analytics.* TO 'analyst_read';
GRANT SELECT, INSERT, UPDATE ON analytics.* TO 'analyst_write';

-- Create users
CREATE USER 'data_analyst'@'%' IDENTIFIED BY 'SecurePass2024!';
CREATE USER 'etl_job'@'%' IDENTIFIED BY 'EtlPass2024!';

-- Assign roles to users
GRANT 'analyst_read' TO 'data_analyst'@'%';
GRANT 'analyst_read', 'analyst_write' TO 'etl_job'@'%';

-- Configure default roles
SET DEFAULT ROLE 'analyst_read' TO 'data_analyst'@'%';
SET DEFAULT ROLE ALL TO 'etl_job'@'%';
```

Now `data_analyst` logs in with read access by default, and `etl_job` gets both read and write access automatically.

## Difference Between SET DEFAULT ROLE and ALTER USER DEFAULT ROLE

Both achieve the same result but have different syntax:

```sql
-- Using SET DEFAULT ROLE
SET DEFAULT ROLE 'app_reader' TO 'alice'@'%';

-- Using ALTER USER (equivalent)
ALTER USER 'alice'@'%' DEFAULT ROLE 'app_reader';
```

Both are equally valid. `ALTER USER` supports `CURRENT_USER` syntax, while `SET DEFAULT ROLE` can target multiple users in a single statement.

## Removing Default Roles

```sql
-- Remove all default roles from a user
SET DEFAULT ROLE NONE TO 'alice'@'%';

-- Equivalent with ALTER USER
ALTER USER 'alice'@'%' DEFAULT ROLE NONE;
```

## Summary

`SET DEFAULT ROLE` configures which roles automatically activate when a MySQL user logs in. Use it to ensure users have the correct privilege set from session start without requiring them to manually run `SET ROLE`. For broad deployments, `activate_all_roles_on_login = ON` provides a simpler alternative, while per-user defaults offer more granular control.
