# How to Handle Deprecated Features After MySQL Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, Deprecated Features, Migration, Database

Description: Learn how to identify and fix deprecated MySQL features after an upgrade, including removed query cache, old authentication, and SQL mode changes.

---

## Why Deprecated Features Break After Upgrades

MySQL upgrades remove or change behaviors that were previously deprecated. Applications relying on these behaviors can break silently - returning wrong results, failing authentication, or throwing SQL errors. Proactively identifying and fixing deprecated features before or immediately after an upgrade prevents production incidents.

## Step 1: Check for Deprecation Warnings in the Error Log

After upgrading, monitor the MySQL error log for deprecation warnings:

```bash
grep -i "deprecated\|warning" /var/log/mysql/error.log | head -50
```

Enable verbose logging in the error log to capture deprecation warnings:

```text
[mysqld]
log_error_verbosity = 3   # Include notes and warnings
```

## Removed: Query Cache

The query cache was removed in MySQL 8.0. Code using `SQL_CACHE` hints will generate syntax errors. `SQL_NO_CACHE` is deprecated and accepted as a no-op but should also be removed:

```sql
-- This fails in MySQL 8.0 (syntax error)
SELECT SQL_CACHE * FROM products WHERE id = 1;

-- This is accepted but deprecated and has no effect
SELECT SQL_NO_CACHE * FROM products WHERE id = 1;

-- Fix: remove the hint
SELECT * FROM products WHERE id = 1;
```

Also remove these settings from `my.cnf`:

```text
# Remove these - they no longer exist in MySQL 8.0
# query_cache_size = 64M
# query_cache_type = 1
# query_cache_limit = 2M
```

Replace with application-level caching using Redis or Memcached.

## Changed: GROUP BY Implicit Sorting Removed

MySQL 5.7 sorted results for `GROUP BY` implicitly. MySQL 8.0 does not:

```sql
-- May return results in different order in MySQL 8.0
SELECT department, COUNT(*) FROM employees GROUP BY department;

-- Fix: add explicit ORDER BY if order matters
SELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY department;
```

## Changed: Default Authentication Plugin

From `mysql_native_password` to `caching_sha2_password`:

```sql
-- Find users using old plugin
SELECT user, host, plugin FROM mysql.user WHERE plugin = 'mysql_native_password';

-- Update to new plugin for better security
ALTER USER 'appuser'@'%' IDENTIFIED WITH caching_sha2_password BY 'newpassword';
```

Update application connection strings to use an encrypted connection (SSL/TLS) or RSA key pair exchange, which `caching_sha2_password` requires for password exchange:

```python
# Python example with ssl_ca
import mysql.connector
conn = mysql.connector.connect(
    host='localhost',
    user='appuser',
    password='newpassword',
    ssl_ca='/etc/mysql/certs/ca.pem',
    ssl_verify_cert=True
)
```

## Deprecated: utf8 Alias for utf8mb3

`utf8` (an alias for `utf8mb3`) is deprecated in MySQL 8.0 in favor of `utf8mb4`. Convert:

```sql
-- Find columns using utf8mb3 (MySQL 8.0 reports the canonical name)
SELECT table_schema, table_name, column_name, character_set_name
FROM information_schema.columns
WHERE character_set_name IN ('utf8', 'utf8mb3');

-- Fix
ALTER TABLE mytable
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Deprecated: ZEROFILL Attribute

`ZEROFILL` and the display width attribute for integer types are deprecated in MySQL 8.0 and will be removed in a future version. Note that `UNSIGNED` for integer types (INT, BIGINT, etc.) is still valid and not deprecated - only `UNSIGNED` for FLOAT, DOUBLE, and DECIMAL is deprecated:

```sql
-- Old: not recommended
CREATE TABLE t1 (
  id INT UNSIGNED ZEROFILL
);

-- Fix: use standard INT and LPAD() for display
CREATE TABLE t1 (
  id INT
);

-- For display formatting
SELECT LPAD(id, 5, '0') FROM t1;
```

## Removed: Functions

Some functions were removed or changed in MySQL 8.0:

| Old Function | Replacement |
|-------------|-------------|
| `PASSWORD()` | `caching_sha2_password` or `sha2()` |
| `ENCRYPT()` | `AES_ENCRYPT()` |
| `DES_ENCRYPT()` | `AES_ENCRYPT()` |
| `SQL_CALC_FOUND_ROWS` | Use `COUNT(*)` subquery |

Fix `SQL_CALC_FOUND_ROWS` usage:

```sql
-- Old approach (deprecated in 8.0)
SELECT SQL_CALC_FOUND_ROWS * FROM products LIMIT 10;
SELECT FOUND_ROWS();

-- New approach
SELECT * FROM products LIMIT 10;
SELECT COUNT(*) FROM products;
```

## Changed: SQL Mode Defaults

MySQL 8.0 enables stricter SQL modes by default. Check for differences:

```sql
SHOW VARIABLES LIKE 'sql_mode';
```

If your application relied on implicit default values for `NOT NULL` columns:

```sql
-- Old behavior (may have silently inserted empty strings or 0)
INSERT INTO users (name, age) VALUES ('Alice', NULL);  -- age was silently set to 0

-- MySQL 8.0 with STRICT mode: this now throws an error
-- Fix: either provide a value or define a DEFAULT
ALTER TABLE users MODIFY age INT DEFAULT 0;
```

## Use mysqlcheck to Find Issues

```bash
mysqlcheck -u root -p --all-databases --auto-repair
```

## Summary

After a MySQL upgrade, check the error log for deprecation warnings, remove query cache usage, update `GROUP BY` queries with explicit `ORDER BY`, convert authentication to `caching_sha2_password`, and migrate `utf8` columns to `utf8mb4`. Use the MySQL Shell upgrade checker before upgrading to identify all breaking changes proactively.
