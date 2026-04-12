# How to Understand Deprecations and Removals in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Migration, Upgrade, Compatibility, Configuration

Description: Learn which key features were deprecated or removed in MySQL 8.0 and how to update your code and configuration before upgrading.

---

## Why Deprecations and Removals Matter

Upgrading to MySQL 8.0 from 5.7 requires addressing deprecated and removed features before you migrate. Ignoring them can cause silent behavior changes, startup failures, or broken queries. This guide covers the most impactful changes.

## Removed: Query Cache

The query cache was completely removed in MySQL 8.0. It was deprecated in 5.7 because it caused severe mutex contention on write-heavy workloads and provided minimal benefit for most applications.

```sql
-- These variables no longer exist in MySQL 8.0
-- SHOW VARIABLES LIKE 'query_cache%';  -- Returns empty in MySQL 8

-- Remove from my.cnf before upgrading
-- query_cache_type = 1       -- REMOVE THIS
-- query_cache_size = 64M     -- REMOVE THIS
```

Replace query cache with application-level caching (Redis, Memcached) or proper index optimization.

## Removed: mysql_native_password as Default

As of MySQL 8.0, the default authentication plugin is `caching_sha2_password`. Older clients that only support `mysql_native_password` will fail to connect.

```sql
-- Check which users still use the old plugin
SELECT user, host, plugin
FROM mysql.user
WHERE plugin = 'mysql_native_password';

-- Migrate users to the new plugin
ALTER USER 'app_user'@'%'
    IDENTIFIED WITH caching_sha2_password BY 'new_password';
```

## Removed: Implicit GROUP BY Sorting

Several old SQL behaviors are removed. One of the most common surprises is the implicit sorting change:

```sql
-- OLD (may not work): Using GROUP BY with implicit sorting guarantee
-- In MySQL 5.7, GROUP BY implied ORDER BY. In 8.0 it does not.
SELECT department, COUNT(*) FROM employees GROUP BY department;
-- This no longer guarantees ordered output - add ORDER BY explicitly

SELECT department, COUNT(*) FROM employees
GROUP BY department
ORDER BY department;
```

## Deprecated: mysql_native_password Plugin (8.0 to 8.4)

```bash
# Check for deprecation warnings in the error log
tail -f /var/log/mysql/error.log | grep -i deprecat
```

```sql
-- Identify deprecated usage
SELECT user, host, plugin
FROM mysql.user
WHERE plugin NOT IN ('caching_sha2_password', 'auth_socket', 'mysql_no_login');
```

## Configuration Variables Removed or Renamed

```text
# Variables removed in MySQL 8.0 - remove from my.cnf:
# query_cache_type
# query_cache_size
# query_cache_limit
# query_cache_min_res_unit
# innodb_locks_unsafe_for_binlog
# tx_isolation (use transaction_isolation)
# tx_read_only (use transaction_read_only)
# date_format, datetime_format (use SQL standards)
```

```sql
-- Check for removed variable usage
SHOW VARIABLES LIKE 'transaction_isolation';  -- New name
-- Was: tx_isolation in MySQL 5.7
```

## SQL Mode Changes

MySQL 8.0 enables stricter SQL modes by default:

```sql
-- Check current SQL mode
SELECT @@sql_mode;

-- MySQL 8.0 default includes:
-- ONLY_FULL_GROUP_BY, STRICT_TRANS_TABLES, NO_ZERO_IN_DATE,
-- NO_ZERO_DATE, ERROR_FOR_DIVISION_BY_ZERO, NO_ENGINE_SUBSTITUTION

-- Issues this may cause:
-- INSERT with zero dates will now fail
INSERT INTO logs (event_date) VALUES ('0000-00-00');
-- ERROR 1292: Incorrect datetime value: '0000-00-00'
```

## Running the Upgrade Checker

Before upgrading, use the MySQL Shell upgrade checker:

```bash
# Run the upgrade compatibility checker
mysqlsh -- util check-for-server-upgrade \
    --user=root \
    --host=localhost \
    --port=3306 \
    --output-format=TEXT \
    --config-path=/etc/mysql/my.cnf
```

This tool identifies all incompatibilities in your current installation.

## Summary

Upgrading to MySQL 8.0 requires proactively addressing removed features - especially the query cache, authentication plugin changes, implicit GROUP BY ordering, and renamed configuration variables. Running the MySQL Shell upgrade checker before migration gives you a complete inventory of issues to resolve, making the upgrade process predictable and safe.
