# How to Create a Role in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, Security, Privilege, Database Administration

Description: Learn how to create MySQL roles with CREATE ROLE, assign privileges to roles, and use roles to simplify permission management across multiple users.

---

## What Are Roles in MySQL?

Introduced in MySQL 8.0, roles are named collections of privileges. Instead of granting individual privileges to every user separately, you define a role with the required privileges and then grant the role to users. When the role's privileges change, all users with that role automatically inherit the update.

## Creating a Role

```sql
CREATE ROLE 'analyst';
CREATE ROLE 'developer';
CREATE ROLE 'read_only';
```

Roles follow the same naming rules as user accounts. You can also specify a host for the role:

```sql
CREATE ROLE 'app_reader'@'%';
```

## Granting Privileges to a Role

After creating the role, grant privileges to it just as you would to a user:

```sql
-- Read-only role
GRANT SELECT ON mydb.* TO 'read_only';

-- Developer role with read/write
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'developer';

-- Analyst role with SELECT on specific tables
GRANT SELECT ON mydb.orders     TO 'analyst';
GRANT SELECT ON mydb.customers  TO 'analyst';
GRANT SELECT ON mydb.products   TO 'analyst';
```

## Verifying Role Privileges

```sql
SHOW GRANTS FOR 'read_only';
```

Output:

```text
+-----------------------------------------------+
| Grants for read_only@%                        |
+-----------------------------------------------+
| GRANT USAGE ON *.* TO `read_only`@`%`         |
| GRANT SELECT ON `mydb`.* TO `read_only`@`%`   |
+-----------------------------------------------+
```

## Granting a Role to a User

```sql
GRANT 'read_only' TO 'alice'@'localhost';
GRANT 'developer' TO 'bob'@'%';
```

## Activating the Role

Roles must be activated before their privileges take effect in a session. The easiest approach is to set a default role:

```sql
SET DEFAULT ROLE 'read_only' TO 'alice'@'localhost';
```

Or the user can activate it manually at login:

```sql
SET ROLE 'read_only';
```

## Inspecting Role Grants and Assignments

MySQL does not expose a dedicated "list every role in the server" view. To inspect a specific role, use `SHOW GRANTS FOR`:

```sql
SHOW GRANTS FOR 'read_only';
```

To see which roles are granted to users, query the role edge table:

```sql
SELECT TO_USER AS role_name, FROM_USER AS user_name, FROM_HOST AS host
FROM mysql.role_edges
ORDER BY role_name, user_name, host;
```

To see roles that are applicable in the current session, use:

```sql
SELECT ROLE_NAME, IS_DEFAULT, IS_MANDATORY
FROM information_schema.APPLICABLE_ROLES;
```

## Revoking Privileges from a Role

```sql
REVOKE DELETE ON mydb.* FROM 'developer';
```

This change immediately affects all users who have `developer` as an active role.

## Dropping a Role

```sql
DROP ROLE 'analyst';
```

Dropping a role revokes it from all users who had it granted.

## Creating Multiple Roles at Once

```sql
CREATE ROLE 'admin', 'developer', 'analyst', 'read_only';
```

## Summary

MySQL roles (available from MySQL 8.0) allow you to group related privileges into a named object with `CREATE ROLE`, then use `GRANT role TO user` to apply the whole set at once. This dramatically simplifies privilege management when multiple users need the same access pattern. Pair roles with `SET DEFAULT ROLE` to ensure they are active automatically on login.
