# How to Remove Anonymous User Accounts in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, User, Hardening, Best Practice

Description: Learn how to find and remove anonymous MySQL user accounts that allow unauthenticated database access and pose a serious security risk.

---

A fresh MySQL installation may include anonymous user accounts - accounts with an empty username string that allow anyone to connect to the database without credentials. These accounts are a significant security vulnerability and should be removed immediately after installation, before MySQL is placed into production.

## What Are Anonymous Users?

Anonymous MySQL users have an empty string as their username (`''`). Any client connecting from the authorized host is allowed in without a password:

```sql
-- An anonymous user looks like this in mysql.user
-- user = '', host = 'localhost'
```

## Finding Anonymous User Accounts

```sql
-- List all anonymous users
SELECT user, host, authentication_string, plugin
FROM mysql.user
WHERE user = '';
```

If this query returns rows, anonymous users are present. A typical output after a default installation:

```text
+------+-----------+
| user | host      |
+------+-----------+
|      | localhost |
|      | ::1       |
+------+-----------+
```

## Removing Anonymous Users

```sql
-- Remove the anonymous user from localhost
DROP USER IF EXISTS ''@'localhost';

-- Remove the anonymous user from IPv6 loopback
DROP USER IF EXISTS ''@'::1';

-- Remove anonymous user from any host if present
DROP USER IF EXISTS ''@'%';
```

## Using mysql_secure_installation

The `mysql_secure_installation` script automates anonymous user removal as part of initial security hardening:

```bash
mysql_secure_installation
```

During the interactive walkthrough, answer `Y` when asked:

```text
Remove anonymous users? [Y/n] Y
```

## Verifying Anonymous Users Are Removed

```sql
SELECT user, host FROM mysql.user WHERE user = '';
```

This should return an empty result set after removal.

## Additional Security Steps After Removing Anonymous Users

Run these checks as part of initial MySQL hardening:

```sql
-- 1. Remove the test database
DROP DATABASE IF EXISTS test;

-- 2. Disable remote root login
DROP USER IF EXISTS 'root'@'%';
DROP USER IF EXISTS 'root'@'::1';

-- 3. Set a strong root password if not already set
ALTER USER 'root'@'localhost' IDENTIFIED BY 'StrongRootPassword!';
```

## Preventing Anonymous Users in Future Installations

You can script these steps for automated deployments:

```bash
mysql -u root -p"${ROOT_PASSWORD}" <<EOF
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'::1';
DROP DATABASE IF EXISTS test;
DROP USER IF EXISTS 'root'@'%';
EOF
```

## Verifying No Unauthenticated Access

Test from localhost to confirm anonymous login no longer works:

```bash
# This should fail after removing anonymous users
mysql --user="" --host=localhost
```

```text
ERROR 1045 (28000): Access denied for user ''@'localhost' (using password: NO)
```

## Summary

Anonymous MySQL users are a critical security gap that should be eliminated before any production deployment. Use `DROP USER` to remove them, verify with a `SELECT` query against `mysql.user`, and run `mysql_secure_installation` as part of your standard post-installation hardening checklist. Follow up by removing the test database and disabling remote root access for a complete baseline security configuration.
