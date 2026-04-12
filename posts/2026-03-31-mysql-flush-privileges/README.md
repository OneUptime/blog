# How to Use FLUSH PRIVILEGES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Administration

Description: Learn when and how to use FLUSH PRIVILEGES in MySQL to reload grant tables after legacy recovery steps, and why normal account-management statements do not need it.

---

## What Is FLUSH PRIVILEGES

`FLUSH PRIVILEGES` instructs MySQL to re-read the grant tables from the `mysql` system database and update its in-memory privilege cache. MySQL stores user accounts, passwords, and access rights in tables like `mysql.user`, `mysql.db`, and `mysql.tables_priv`. When these tables are modified through `GRANT`, `REVOKE`, `CREATE USER`, or `DROP USER` statements, MySQL automatically refreshes the cache. If you inherit a legacy server that was repaired by editing grant tables directly, you may need `FLUSH PRIVILEGES` afterward to force MySQL to reread them.

```sql
FLUSH PRIVILEGES;
```

## When You Need FLUSH PRIVILEGES

You need `FLUSH PRIVILEGES` only after a legacy manual repair of the grant tables. You do NOT need `FLUSH PRIVILEGES` when using:

```sql
-- These auto-reload the grant tables
CREATE USER 'analyst'@'localhost' IDENTIFIED BY 'securepass';
GRANT SELECT ON reports.* TO 'analyst'@'localhost';
REVOKE SELECT ON reports.* FROM 'analyst'@'localhost';
DROP USER 'analyst'@'localhost';
```

## Required Privilege

To run `FLUSH PRIVILEGES`, you need the `RELOAD` privilege:

```sql
GRANT RELOAD ON *.* TO 'dba_user'@'localhost';
```

## Legacy Recovery Only

If you inherited a server that was edited manually in the past, run `FLUSH PRIVILEGES` after the repair step so MySQL rereads the grant tables. Do not use `INSERT`, `UPDATE`, or `DELETE` against grant tables in normal administration.

## Verifying the Effect

You can verify that privilege changes have been applied by checking the session privileges:

```sql
-- Check current user privileges
SHOW GRANTS FOR 'analyst'@'localhost';

-- Check in the grant tables directly
SELECT User, Host, Select_priv, Insert_priv
FROM mysql.user
WHERE User = 'analyst';
```

## FLUSH PRIVILEGES on a Replica

`FLUSH PRIVILEGES` is not written to the binary log, so it does not replicate to replicas. If you repair a legacy grant-table state on the primary, you must run `FLUSH PRIVILEGES` separately on each replica that needs the same refresh:

```sql
-- Run on the primary
FLUSH PRIVILEGES;

-- Then connect to each replica and run it there as well
FLUSH PRIVILEGES;
```

## Common Mistake: Unnecessary FLUSH PRIVILEGES

A frequent misconception is to run `FLUSH PRIVILEGES` after every user management operation. This is unnecessary and slightly wasteful:

```sql
-- No need to flush after these
CREATE USER 'reader'@'%' IDENTIFIED BY 'pass';
GRANT SELECT ON app_db.* TO 'reader'@'%';
FLUSH PRIVILEGES; -- unnecessary here
```

Running it when not needed is harmless but adds confusion about when it is actually required.

## Summary

`FLUSH PRIVILEGES` reloads the grant tables into memory and is only necessary after legacy manual repairs to the `mysql` system tables. Always prefer `CREATE USER`, `GRANT`, `REVOKE`, `ALTER USER`, and `DROP USER`, which handle cache updates automatically.
