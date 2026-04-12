# How to Grant a Role to a User in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, User, Privilege, Database Administration

Description: Learn how to grant MySQL roles to user accounts, activate them, set defaults, and verify effective privileges in MySQL 8.0 and later.

---

## Granting a Role to a User

In MySQL 8.0+, use `GRANT role TO user` to assign a role to an account:

```sql
GRANT 'read_only' TO 'alice'@'localhost';
GRANT 'developer' TO 'bob'@'%';
```

You can grant multiple roles in a single statement:

```sql
GRANT 'read_only', 'analyst' TO 'carol'@'%';
```

## Granting a Role with Admin Option

The `WITH ADMIN OPTION` allows the recipient to grant the role to other users:

```sql
GRANT 'developer' TO 'tech_lead'@'%' WITH ADMIN OPTION;
```

Use this sparingly - it allows the recipient to escalate privileges.

## Verifying Role Grants

```sql
SHOW GRANTS FOR 'alice'@'localhost';
```

Output:

```text
+-----------------------------------------------------+
| Grants for alice@localhost                          |
+-----------------------------------------------------+
| GRANT USAGE ON *.* TO `alice`@`localhost`            |
| GRANT `read_only`@`%` TO `alice`@`localhost`         |
+-----------------------------------------------------+
```

The role appears as a grant but its underlying privileges are not listed here. To see effective privileges:

```sql
SHOW GRANTS FOR 'alice'@'localhost' USING 'read_only';
```

Output now includes the role's privileges:

```text
+-----------------------------------------------------------+
| Grants for alice@localhost                                |
+-----------------------------------------------------------+
| GRANT USAGE ON *.* TO `alice`@`localhost`                  |
| GRANT SELECT ON `mydb`.* TO `alice`@`localhost`            |
| GRANT `read_only`@`%` TO `alice`@`localhost`               |
+-----------------------------------------------------------+
```

## Checking Roles via mysql.role_edges

Query role assignments for a specific user:

```sql
SELECT FROM_USER, FROM_HOST, TO_USER, TO_HOST, WITH_ADMIN_OPTION
FROM mysql.role_edges
WHERE TO_USER = 'alice';
```

Or for all role assignments:

```sql
SELECT FROM_USER AS role_name, TO_USER AS user_name, TO_HOST
FROM mysql.role_edges;
```

## Activating the Role in a Session

A granted role is not active by default unless a default is set. A user can activate a role manually:

```sql
SET ROLE 'read_only';

-- Activate all granted roles
SET ROLE ALL;

-- Deactivate all roles
SET ROLE NONE;
```

## Setting a Default Role (Automatic Activation)

```sql
SET DEFAULT ROLE 'read_only' TO 'alice'@'localhost';
```

Now `alice` automatically has `read_only` privileges active on every login without manually running `SET ROLE`.

## Revoking a Role from a User

```sql
REVOKE 'read_only' FROM 'alice'@'localhost';
```

After this, Alice loses the privileges that came from `read_only`. Any directly granted privileges remain.

## Granting a Role to Multiple Users

```sql
GRANT 'read_only' TO
  'alice'@'localhost',
  'bob'@'%',
  'carol'@'192.168.1.5';
```

## Summary

`GRANT 'role' TO 'user'@'host'` assigns a MySQL 8.0 role to a user. Roles must be activated - either manually with `SET ROLE` or automatically via `SET DEFAULT ROLE`. Use `SHOW GRANTS FOR user USING role` to inspect effective privileges including role contributions. Roles simplify privilege management by applying a group of permissions to multiple users with a single statement.
