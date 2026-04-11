# How to Set Default Roles in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, User, Security, Database Administration

Description: Learn how to configure MySQL default roles so users automatically have the right privileges on every login without manually activating roles each session.

---

## Why Default Roles Matter

In MySQL 8.0, granting a role to a user does not automatically activate it. On each new connection, the user starts with no active roles unless default roles are configured. `SET DEFAULT ROLE` solves this by specifying which roles should be automatically active at login.

## Setting a Default Role for a User

```sql
-- Grant the role first
GRANT 'developer' TO 'alice'@'localhost';

-- Then set it as the default
SET DEFAULT ROLE 'developer' TO 'alice'@'localhost';
```

Now whenever Alice connects, the `developer` role is immediately active.

## Setting Multiple Default Roles

```sql
GRANT 'read_only', 'analyst' TO 'bob'@'%';

SET DEFAULT ROLE 'read_only', 'analyst' TO 'bob'@'%';
```

All listed roles are active from login.

## Setting ALL Granted Roles as Default

```sql
SET DEFAULT ROLE ALL TO 'carol'@'%';
```

This activates every role currently granted to Carol. If new roles are granted later, run `SET DEFAULT ROLE ALL` again or use `activate_all_roles_on_login` to cover future grants automatically.

## Setting Default Roles for Multiple Users at Once

```sql
SET DEFAULT ROLE ALL TO
  'alice'@'localhost',
  'bob'@'%',
  'carol'@'192.168.1.5';
```

## Resetting Default Roles to None

```sql
SET DEFAULT ROLE NONE TO 'alice'@'localhost';
```

After this, Alice must manually activate roles each session with `SET ROLE`.

## Checking Current Default Roles

```sql
SELECT USER, HOST, DEFAULT_ROLE_USER, DEFAULT_ROLE_HOST
FROM mysql.default_roles
WHERE USER = 'alice';
```

## Using ALTER USER to Set Default Roles

In MySQL 8.0, you can also set default roles via `ALTER USER`:

```sql
ALTER USER 'alice'@'localhost' DEFAULT ROLE 'developer';
```

This is equivalent to `SET DEFAULT ROLE` and is useful in user-creation scripts:

```sql
CREATE USER 'alice'@'localhost' IDENTIFIED BY 'AlicePass!';
GRANT 'developer' TO 'alice'@'localhost';
ALTER USER 'alice'@'localhost' DEFAULT ROLE 'developer';
```

## Server-Level Default Role Setting

The `activate_all_roles_on_login` system variable causes all granted roles to be activated automatically for all users on login:

```sql
SET GLOBAL activate_all_roles_on_login = ON;
```

Or in `my.cnf`:

```text
[mysqld]
activate_all_roles_on_login = ON
```

This is a global setting and overrides per-user defaults: when enabled, all granted roles are activated at login regardless of `SET DEFAULT ROLE` settings. Turn it off if you need granular per-user control.

## Verifying Role Activation at Login

After setting defaults, log in as the user and verify:

```sql
SELECT CURRENT_ROLE();
```

Output should show the active roles, for example:

```text
+--------------------+
| CURRENT_ROLE()     |
+--------------------+
| `developer`@`%`    |
+--------------------+
```

## Summary

`SET DEFAULT ROLE role TO 'user'@'host'` ensures MySQL roles are automatically active at login, eliminating the need for users to run `SET ROLE` each session. Use `SET DEFAULT ROLE ALL` to activate all granted roles, or `activate_all_roles_on_login = ON` as a server-wide policy. Always verify with `SELECT CURRENT_ROLE()` after login to confirm the configuration is working as expected.
