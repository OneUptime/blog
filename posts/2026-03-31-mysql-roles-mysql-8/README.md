# How to Use Roles in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Role, Permission, Authentication

Description: Learn how to use MySQL 8 roles to group privileges and assign them to users, simplifying access control management.

---

## What Are Roles in MySQL 8?

Before MySQL 8.0, managing privileges for multiple users with similar access requirements meant granting the same set of privileges individually to each user. MySQL 8.0 introduced roles - named collections of privileges that can be granted to users as a single unit.

Roles work like a template: define the privilege set once, then grant the role to any number of users. Revoking a role removes all its associated privileges from every user who holds it.

## Creating Roles

```sql
-- Create roles for different access levels
CREATE ROLE 'app_read';
CREATE ROLE 'app_write';
CREATE ROLE 'app_admin';
```

## Granting Privileges to Roles

```sql
-- Grant read-only privileges to the read role
GRANT SELECT ON myapp.* TO 'app_read';

-- Grant write privileges to the write role
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app_write';

-- Grant full administrative privileges to the admin role
GRANT ALL PRIVILEGES ON myapp.* TO 'app_admin';
```

## Creating Users and Assigning Roles

```sql
-- Create application users
CREATE USER 'api_service'@'%' IDENTIFIED BY 'strong_password_1';
CREATE USER 'data_analyst'@'%' IDENTIFIED BY 'strong_password_2';
CREATE USER 'db_admin'@'%' IDENTIFIED BY 'strong_password_3';

-- Assign roles to users
GRANT 'app_write' TO 'api_service'@'%';
GRANT 'app_read' TO 'data_analyst'@'%';
GRANT 'app_admin' TO 'db_admin'@'%';

-- A user can hold multiple roles
CREATE USER 'power_user'@'%' IDENTIFIED BY 'strong_password_4';
GRANT 'app_read', 'app_write' TO 'power_user'@'%';
```

## Activating Roles

By default in MySQL 8.0, granted roles are not automatically active. Users must activate them:

```sql
-- Activate a specific role for the current session
SET ROLE 'app_write';

-- Activate all granted roles
SET ROLE ALL;

-- Check currently active roles
SELECT CURRENT_ROLE();
```

To make roles activate automatically on login, set them as default roles:

```sql
-- Set default roles so they activate on login
SET DEFAULT ROLE 'app_write' TO 'api_service'@'%';
SET DEFAULT ROLE ALL TO 'db_admin'@'%';
```

Alternatively, configure this server-wide:

```sql
-- Make all granted roles active by default for all users
SET PERSIST activate_all_roles_on_login = ON;
```

## Inspecting Roles

```sql
-- View all roles and their privilege grants
SHOW GRANTS FOR 'app_read';

-- View roles granted to a specific user
SHOW GRANTS FOR 'api_service'@'%' USING 'app_write';

-- View role membership from the mysql system schema
SELECT FROM_USER, FROM_HOST, TO_USER, TO_HOST
FROM mysql.role_edges
WHERE TO_USER = 'api_service';
```

## Revoking and Dropping Roles

```sql
-- Revoke a role from a user
REVOKE 'app_write' FROM 'api_service'@'%';

-- Drop a role entirely (removes it from all users who hold it)
DROP ROLE 'app_read';
```

## Summary

MySQL 8.0 roles provide a clean, scalable approach to privilege management. Rather than maintaining per-user privilege lists, you define access patterns as roles and assign them to users. This reduces administrative overhead, minimizes human error, and makes access auditing straightforward - especially in environments with many users sharing similar access requirements.
