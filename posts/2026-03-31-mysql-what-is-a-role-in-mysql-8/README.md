# What Is a Role in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, Access Control, Security

Description: A role in MySQL 8 is a named collection of privileges that can be assigned to users, simplifying permission management across multiple accounts.

---

## Overview

Roles were introduced in MySQL 8.0 as a way to group privileges together under a named entity and then assign that role to one or more users. Instead of granting individual privileges to each user, you define a role with the needed privileges once and grant the role to any number of users.

Roles simplify access control management, especially in environments with many users that share similar permission sets.

## Creating a Role

```sql
-- Create roles
CREATE ROLE 'app_reader';
CREATE ROLE 'app_writer';
CREATE ROLE 'app_admin';
```

## Granting Privileges to Roles

```sql
-- Grant read-only access
GRANT SELECT ON myapp.* TO 'app_reader';

-- Grant write access
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app_writer';

-- Grant admin access
GRANT ALL PRIVILEGES ON myapp.* TO 'app_admin';
```

## Assigning Roles to Users

```sql
-- Create users
CREATE USER 'alice'@'%' IDENTIFIED BY 'alice_password';
CREATE USER 'bob'@'%' IDENTIFIED BY 'bob_password';
CREATE USER 'carol'@'%' IDENTIFIED BY 'carol_password';

-- Assign roles
GRANT 'app_reader' TO 'alice'@'%';
GRANT 'app_writer' TO 'bob'@'%';
GRANT 'app_admin' TO 'carol'@'%';
```

## Activating Roles

Roles must be activated before they take effect. Users can activate roles manually:

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

## Setting Default Roles

To avoid requiring users to manually activate roles every session:

```sql
-- Set default roles for a user
SET DEFAULT ROLE 'app_reader' TO 'alice'@'%';
SET DEFAULT ROLE ALL TO 'bob'@'%';

-- Or use mandatory roles (global - applies to all users)
SET PERSIST mandatory_roles = 'app_reader';
```

## Checking Roles

```sql
-- Inspect a specific role
SHOW GRANTS FOR 'app_reader';

-- View role grants for a user
SHOW GRANTS FOR 'alice'@'%';
SHOW GRANTS FOR 'alice'@'%' USING 'app_reader';

-- View role assignments
SELECT FROM_USER AS role_name, TO_USER AS user_name, TO_HOST AS host
FROM mysql.role_edges;

-- View default role assignments
SELECT * FROM mysql.default_roles;
```

## Role Inheritance (Role to Role)

Roles can be granted to other roles, creating a hierarchy:

```sql
-- Create a hierarchy
CREATE ROLE 'senior_writer';
GRANT 'app_writer' TO 'senior_writer';      -- inherits writer
GRANT DROP ON myapp.* TO 'senior_writer';     -- plus extra (TRUNCATE requires DROP)

-- Grant the composite role to a user
GRANT 'senior_writer' TO 'dave'@'%';
SET DEFAULT ROLE ALL TO 'dave'@'%';
```

## Revoking Roles

```sql
-- Revoke a role from a user
REVOKE 'app_reader' FROM 'alice'@'%';

-- Drop a role entirely
DROP ROLE 'app_reader';
```

## Mandatory Roles

Mandatory roles are automatically active for all users without needing to be granted explicitly:

```sql
-- Set mandatory roles in config
SET PERSIST mandatory_roles = 'app_reader,monitoring_user';

-- Or in my.cnf
```

```text
[mysqld]
mandatory_roles = 'app_reader@%,monitoring_user@%'
```

## Summary

MySQL 8 roles provide a clean way to manage database privileges at scale. By grouping permissions into roles and assigning roles to users, you avoid repetitive individual GRANT statements and make it easy to update permissions across all users of a given type by modifying the role. Use default roles and mandatory roles to ensure role activation happens automatically.
