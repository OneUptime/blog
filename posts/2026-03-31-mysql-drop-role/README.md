# How to Use DROP ROLE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, Security

Description: Learn how to use DROP ROLE in MySQL to remove role definitions, revoke roles from users, and safely clean up access control configurations.

---

## What Is DROP ROLE

`DROP ROLE` removes one or more role definitions from MySQL. A dropped role is automatically revoked from any user account or role to which it was granted. This command requires the `DROP ROLE` or `CREATE USER` privilege.

```sql
DROP ROLE 'role_name';
DROP ROLE 'role_name'@'host';
```

## Basic Usage

Drop a single role:

```sql
DROP ROLE 'app_reader';
```

Drop multiple roles in one statement:

```sql
DROP ROLE 'app_reader', 'app_writer', 'app_admin';
```

## Check Before Dropping

Before dropping a role, check what users have it assigned and what privileges it holds:

```sql
-- See privileges assigned to the role
SHOW GRANTS FOR 'app_reader';

-- See which users have this role
SELECT FROM_USER, FROM_HOST, TO_USER, TO_HOST
FROM mysql.role_edges
WHERE FROM_USER = 'app_reader';
```

## Revoking a Role Before Dropping

Although dropping a role automatically revokes it from all assigned users, best practice is to audit and revoke explicitly first so you know exactly who is affected:

```sql
-- Revoke the role from all users who have it
REVOKE 'app_reader' FROM 'alice'@'%';
REVOKE 'app_reader' FROM 'bob'@'%';

-- Now drop the role
DROP ROLE 'app_reader';
```

When a role is dropped, MySQL automatically revokes it from all granted accounts. Within any active session, the adjusted privileges take effect beginning with the next statement executed.

## DROP ROLE IF EXISTS

To avoid errors when the role may not exist:

```sql
DROP ROLE IF EXISTS 'app_reader';
DROP ROLE IF EXISTS 'app_reader', 'app_writer';
```

## Role Cleanup Example

Here is a complete workflow for removing a role and cleaning up:

```sql
-- Step 1: Identify role members
SELECT FROM_USER AS role, TO_USER AS member, TO_HOST
FROM mysql.role_edges
WHERE FROM_USER = 'reporting_reader';

-- Step 2: Revoke from all members
REVOKE 'reporting_reader' FROM 'analyst1'@'%';
REVOKE 'reporting_reader' FROM 'analyst2'@'%';

-- Step 3: Check if anyone has it as a default role
SELECT User, Host, default_role_user, default_role_host
FROM mysql.default_roles
WHERE default_role_user = 'reporting_reader';

-- Step 4: Remove from default roles if needed
ALTER USER 'analyst1'@'%' DEFAULT ROLE NONE;

-- Step 5: Drop the role
DROP ROLE 'reporting_reader';
```

## Effect on Active Sessions

If a user has an active session with the dropped role activated, the adjusted privileges apply beginning with the next statement executed. Their session continues but any subsequent queries requiring those privileges will fail.

```sql
-- After dropping 'app_reader', users with active sessions see:
-- ERROR 1142 (42000): SELECT command denied to user 'alice'@'%' for table 'products'
```

## Verifying Removal

```sql
-- Confirm the role no longer exists
SELECT User, Host FROM mysql.user WHERE User = 'app_reader';

-- Should return empty result
```

## Required Privileges

```sql
-- Need DROP ROLE or CREATE USER privilege
GRANT DROP ROLE ON *.* TO 'security_admin'@'localhost';
-- or
GRANT CREATE USER ON *.* TO 'security_admin'@'localhost';
```

## Summary

`DROP ROLE` removes role definitions from MySQL and automatically revokes the role from all granted accounts. Always audit which users hold the role before dropping to avoid unexpected privilege loss. Use `DROP ROLE IF EXISTS` in scripts to prevent errors. After dropping, verify removal by querying `mysql.user` and ensure users have appropriate direct or alternative role-based privileges.
