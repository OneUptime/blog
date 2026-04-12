# How to Drop a User in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Security, Database Administration, Privilege

Description: Learn how to safely drop MySQL user accounts with DROP USER, handle errors, revoke privileges first, and verify removal from the system.

---

## The DROP USER Statement

Removing a MySQL user account is done with the `DROP USER` statement. This drops the account and all its privileges atomically:

```sql
DROP USER 'username'@'host';
```

The host portion matters because MySQL accounts are identified as username-host pairs. If you omit the host part, it defaults to `'%'`. Using the wrong host will target a different account.

## Dropping a Local User

```sql
DROP USER 'alice'@'localhost';
```

## Dropping a Remote User

```sql
DROP USER 'bob'@'%';
DROP USER 'bob'@'192.168.1.100';
```

Note that `'bob'@'%'` and `'bob'@'localhost'` are two separate accounts. Dropping one does not drop the other.

## Using IF EXISTS to Avoid Errors

If the user may not exist, use `IF EXISTS` to suppress the error:

```sql
DROP USER IF EXISTS 'alice'@'localhost';
```

Without `IF EXISTS`, dropping a non-existent user raises:

```text
ERROR 1396 (HY000): Operation DROP USER failed for 'alice'@'localhost'
```

## Dropping Multiple Users at Once

```sql
DROP USER
  'alice'@'localhost',
  'bob'@'%',
  'temp_user'@'192.168.1.5';
```

## What DROP USER Does Automatically

`DROP USER` automatically:
- Removes all global, database, table, column, and routine privileges for the account from the grant tables
- Removes the account from `mysql.user`
- Does NOT automatically close open sessions for that user. The drop takes full effect once the user's existing sessions are closed, and subsequent login attempts will fail

You do NOT need to manually `REVOKE` privileges before running `DROP USER`.

## Verifying the User Was Removed

```sql
SELECT user, host FROM mysql.user WHERE user = 'alice';
-- Should return empty set
```

Or check grants (should return an error if the user is gone):

```sql
SHOW GRANTS FOR 'alice'@'localhost';
-- ERROR 1141: There is no such grant defined for user 'alice' on host 'localhost'
```

## Finding All Accounts for a Username

Before dropping, identify all host variants of a username to avoid leaving orphaned accounts:

```sql
SELECT user, host FROM mysql.user WHERE user = 'bob';
```

```text
+------+---------------+
| user | host          |
+------+---------------+
| bob  | %             |
| bob  | 192.168.1.100 |
+------+---------------+
```

Drop each variant separately or in one statement.

## Required Privileges to Drop a User

You need the `CREATE USER` privilege (or the `DELETE` privilege on the `mysql` system schema) to run `DROP USER`.

```sql
-- Check your own privileges
SHOW GRANTS;
```

## Summary

`DROP USER 'name'@'host'` removes a MySQL account and all associated privileges in a single operation. Use `IF EXISTS` for idempotent scripts, and identify all host variants before dropping to avoid leaving orphaned accounts. Note that `DROP USER` does not close existing sessions for the dropped user; the drop takes full effect once open sessions end.
