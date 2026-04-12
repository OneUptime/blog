# How to Use Roles for Access Control in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Role, Access Control, MySQL 8

Description: Learn how to create and use roles in MySQL 8 to simplify privilege management by grouping permissions and assigning them to multiple users at once.

---

## What Are Roles in MySQL 8?

MySQL 8.0 introduced native role support. A role is a named collection of privileges. Instead of granting the same set of privileges to each user individually, you define the privileges once on a role and grant the role to users. When you update the role's privileges, all users with that role automatically get the change.

## Creating a Role

```sql
CREATE ROLE 'readonly_role';
CREATE ROLE 'developer_role';
CREATE ROLE 'admin_role';
```

## Granting Privileges to a Role

```sql
-- Read-only access to a specific database
GRANT SELECT ON shop.* TO 'readonly_role';

-- Read/write for developers
GRANT SELECT, INSERT, UPDATE, DELETE ON shop.* TO 'developer_role';

-- Full access for admins
GRANT ALL PRIVILEGES ON shop.* TO 'admin_role';
```

## Assigning Roles to Users

```sql
-- Create users
CREATE USER 'alice'@'%' IDENTIFIED BY 'AlicePassword!';
CREATE USER 'bob'@'%' IDENTIFIED BY 'BobPassword!';
CREATE USER 'carol'@'%' IDENTIFIED BY 'CarolPassword!';

-- Assign roles
GRANT 'readonly_role' TO 'alice'@'%';
GRANT 'developer_role' TO 'bob'@'%';
GRANT 'admin_role' TO 'carol'@'%';
```

## Activating Roles

By default, granted roles are not active at login. Users must activate them:

```sql
-- User activates their role
SET ROLE 'developer_role';

-- Or activate all granted roles
SET ROLE ALL;
```

## Setting Default Roles

To activate roles automatically at login, set them as default:

```sql
-- Admin sets default roles for a user
SET DEFAULT ROLE 'developer_role' TO 'bob'@'%';

-- User sets their own default roles
SET DEFAULT ROLE ALL TO CURRENT_USER();
```

Or configure at the global level in `my.cnf`:

```text
[mysqld]
activate_all_roles_on_login = ON
```

This activates all granted roles for every user at login.

## Verifying Role Assignments

```sql
-- Show all roles granted to a user
SHOW GRANTS FOR 'bob'@'%';

-- Show which roles are active in the current session
SELECT CURRENT_ROLE();

-- Query role assignments from mysql.role_edges
SELECT
  FROM_USER,
  FROM_HOST,
  TO_USER,
  TO_HOST
FROM mysql.role_edges
WHERE TO_USER = 'bob';
```

## Revoking a Role from a User

```sql
REVOKE 'developer_role' FROM 'bob'@'%';
```

## Granting ADMIN OPTION on a Role

Allow a user to grant the role to others:

```sql
GRANT 'developer_role' TO 'team_lead'@'%' WITH ADMIN OPTION;
```

## Nesting Roles

Roles can be granted to other roles:

```sql
CREATE ROLE 'super_dev_role';
GRANT 'developer_role' TO 'super_dev_role';
GRANT SELECT ON analytics.* TO 'super_dev_role';

GRANT 'super_dev_role' TO 'senior_dev'@'%';
```

## Dropping a Role

```sql
DROP ROLE 'readonly_role';
```

This revokes the role from all users who had it.

## Practical Example - Multi-Team Access

```sql
-- Create roles for different teams
CREATE ROLE 'marketing_read', 'sales_write', 'finance_read';

GRANT SELECT ON reports.* TO 'marketing_read';
GRANT SELECT, INSERT, UPDATE ON crm.* TO 'sales_write';
GRANT SELECT ON billing.* TO 'finance_read';

-- Assign appropriate roles to users
CREATE USER 'marketer'@'%' IDENTIFIED BY 'Pass!';
CREATE USER 'salesperson'@'%' IDENTIFIED BY 'Pass!';

GRANT 'marketing_read' TO 'marketer'@'%';
GRANT 'sales_write', 'marketing_read' TO 'salesperson'@'%';

SET DEFAULT ROLE ALL TO 'marketer'@'%';
SET DEFAULT ROLE ALL TO 'salesperson'@'%';
```

## Summary

MySQL 8 roles enable centralized privilege management by grouping permissions into named entities. Create roles with `CREATE ROLE`, grant privileges to roles with `GRANT`, assign roles to users, and set default roles to activate them at login. Enable `activate_all_roles_on_login = ON` globally to avoid requiring each user to manually activate their roles.
