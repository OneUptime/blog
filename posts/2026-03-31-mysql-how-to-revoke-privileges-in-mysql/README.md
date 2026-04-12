# How to Revoke Privileges in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Privilege, Access Control, Administration

Description: Learn how to revoke specific and all privileges from MySQL users and roles using the REVOKE statement with practical examples.

---

## What Is REVOKE?

The `REVOKE` statement removes previously granted privileges from a MySQL user or role. After revoking, the user loses access to the specified operations on the specified objects.

## Basic REVOKE Syntax

```sql
REVOKE privilege_type [(column_list)]
  [, privilege_type [(column_list)]] ...
  ON [object_type] priv_level
  FROM user_or_role [, user_or_role] ...;
```

## Revoking Specific Privileges

Remove SELECT and INSERT from a specific database:

```sql
REVOKE SELECT, INSERT ON shop.* FROM 'reporting_user'@'%';
```

Remove a single privilege on a specific table:

```sql
REVOKE DELETE ON shop.orders FROM 'app_user'@'10.0.0.%';
```

## Revoking All Privileges

Remove all privileges on a specific database:

```sql
REVOKE ALL PRIVILEGES ON shop.* FROM 'temp_user'@'localhost';
```

Remove all global privileges:

```sql
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'old_admin'@'%';
```

Note: `REVOKE ALL PRIVILEGES` does not remove the user itself. Use `DROP USER` to delete the account entirely.

## Checking Privileges Before Revoking

Always check what privileges a user holds before revoking:

```sql
SHOW GRANTS FOR 'app_user'@'%';
```

```text
+----------------------------------------------------------+
| Grants for app_user@%                                    |
+----------------------------------------------------------+
| GRANT SELECT, INSERT, UPDATE ON `shop`.* TO `app_user`@`%` |
+----------------------------------------------------------+
```

## Revoking Column-Level Privileges

MySQL supports column-level privilege grants and revokes:

```sql
-- Revoke SELECT on specific columns
REVOKE SELECT (credit_card_number, ssn)
ON shop.customers
FROM 'limited_user'@'localhost';
```

## Revoking GRANT OPTION

If a user was granted `GRANT OPTION`, revoke it separately:

```sql
REVOKE GRANT OPTION ON shop.* FROM 'power_user'@'%';
```

## Revoking Privileges from a Role (MySQL 8.0)

Privileges can also be revoked from roles:

```sql
REVOKE UPDATE ON shop.orders FROM 'readonly_role';
```

Then the change propagates to all users who have been granted that role.

## Revoking a Role from a User

To remove a role from a user (distinct from revoking privilege from a role):

```sql
REVOKE 'readonly_role' FROM 'reporting_user'@'%';
```

## Applying Changes

`GRANT` and `REVOKE` changes take effect immediately in all MySQL versions without needing `FLUSH PRIVILEGES`. The `FLUSH PRIVILEGES` command is only required when you modify the grant tables directly using DML statements (such as `INSERT`, `UPDATE`, or `DELETE` on the `mysql` system database):

```sql
-- Only needed after direct grant table modifications, NOT after REVOKE
FLUSH PRIVILEGES;
```

## Practical Example - Restricting a User After a Role Change

```sql
-- User was previously a developer, now just a reader
REVOKE INSERT, UPDATE, DELETE ON app.* FROM 'former_dev'@'%';

-- Confirm remaining privileges
SHOW GRANTS FOR 'former_dev'@'%';
```

## Dropping vs. Revoking

| Action | Use When |
|---|---|
| `REVOKE` | Remove specific privileges, keep the user account |
| `DROP USER` | Remove the user account entirely |

```sql
-- Remove all access but keep the account
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'contractor'@'%';

-- Remove the account entirely
DROP USER 'contractor'@'%';
```

## Summary

`REVOKE` removes privileges from MySQL users and roles. Use `REVOKE privilege ON object FROM user` for specific permissions, or `REVOKE ALL PRIVILEGES, GRANT OPTION FROM user` to strip all access. Always verify current privileges with `SHOW GRANTS` before revoking to avoid accidentally removing unintended permissions. Changes from `REVOKE` take effect immediately in all MySQL versions; `FLUSH PRIVILEGES` is only needed after direct modifications to the grant tables.
