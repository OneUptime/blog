# How to Fix ERROR 1396 Operation CREATE USER Failed in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Error, Account, Security

Description: Fix MySQL ERROR 1396 Operation CREATE USER failed by dropping and recreating the account with supported account-management statements.

---

MySQL ERROR 1396 occurs when you try to create a user that already exists or has leftover records in the grant tables. The error reads: `ERROR 1396 (HY000): Operation CREATE USER failed for 'username'@'host'`.

## Why This Happens

The most common causes are:
- The user was removed inconsistently in an older manual recovery flow instead of `DROP USER`
- A partial `CREATE USER` left inconsistent records in the grant tables
- The user exists in `mysql.user` but not in the `mysql.db` or `mysql.proxies_priv` tables
- Replication failed to apply a `DROP USER` (due to filtering or an error), so the user still exists when a subsequent `CREATE USER` arrives

## Check If the User Already Exists

```sql
-- Check the mysql.user table
SELECT User, Host, account_locked, password_expired
FROM mysql.user
WHERE User = 'myapp';

-- List all users with this name
SELECT User, Host FROM mysql.user WHERE User LIKE 'myapp%';
```

## Fix 1: Drop the User First

If the user exists, drop them cleanly before recreating:

```sql
-- Use IF EXISTS to avoid an error if they do not exist
DROP USER IF EXISTS 'myapp'@'localhost';
DROP USER IF EXISTS 'myapp'@'%';

-- Now create the user
CREATE USER 'myapp'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'myapp'@'%';
```

## Fix 2: Recreate the Account Cleanly

If the account already exists under one or more host patterns, drop each explicit account with `DROP USER IF EXISTS` and recreate it:

```sql
DROP USER IF EXISTS 'myapp'@'localhost';
DROP USER IF EXISTS 'myapp'@'%';

CREATE USER 'myapp'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'myapp'@'%';
```

If the server still reports inconsistent grant-table state after a supported drop/recreate cycle, restore the affected instance from backup rather than editing `mysql.user` or related grant tables by hand.

## Fix 3: Use FLUSH PRIVILEGES

Sometimes the in-memory grant cache is out of sync:

```sql
FLUSH PRIVILEGES;

-- Retry the CREATE USER
CREATE USER 'myapp'@'%' IDENTIFIED BY 'strong_password';
```

## Fix 4: Use CREATE USER ... IF NOT EXISTS

MySQL 5.7.6+ supports `IF NOT EXISTS` to avoid the error:

```sql
CREATE USER IF NOT EXISTS 'myapp'@'%' IDENTIFIED BY 'strong_password';
```

This will not update the password if the user already exists.

## Fix 5: Drop and Recreate in a Single Script

MySQL does not support `CREATE OR REPLACE USER`. If you need a one-step replacement, combine `DROP USER IF EXISTS` with `CREATE USER`:

```sql
DROP USER IF EXISTS 'myapp'@'%';
CREATE USER 'myapp'@'%' IDENTIFIED BY 'new_password';
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'myapp'@'%';
```

If the user already exists and you only need to change the password, use `ALTER USER` instead:

```sql
ALTER USER 'myapp'@'%' IDENTIFIED BY 'new_password';
```

## Verify After Fix

```sql
-- Confirm the user exists and is correct
SHOW GRANTS FOR 'myapp'@'%';

-- Test the connection from another session
-- mysql -u myapp -p -h hostname
```

## Summary

ERROR 1396 is caused by leftover or inconsistent account state. The cleanest fix is `DROP USER IF EXISTS` followed by `CREATE USER`. Avoid direct edits to the grant tables; if the account state is badly inconsistent, restore from backup or rebuild the instance rather than deleting rows by hand.
