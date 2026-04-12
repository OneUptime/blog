# How to Disable ONLY_FULL_GROUP_BY in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Mode, GROUP BY, Configuration, Compatibility

Description: Learn how to safely disable ONLY_FULL_GROUP_BY in MySQL when working with legacy queries or migrating from older MySQL versions.

---

`ONLY_FULL_GROUP_BY` is enabled by default in MySQL 5.7.5 and later. While it enforces correct SQL behavior, some applications - especially those built on older MySQL versions or using certain ORM frameworks - generate queries that violate this mode. This guide explains how to disable it safely and what alternatives exist.

## Why You Might Need to Disable It

Common situations include:

- Migrating an application from MySQL 5.5 or 5.6 where this mode was not enabled by default
- Third-party software that generates non-standard GROUP BY queries
- Reporting queries where `ANY_VALUE()` would require many individual changes

## Disabling for the Current Session

The safest approach is to disable the mode only for the session that needs it:

```sql
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ONLY_FULL_GROUP_BY', '');
```

This does not affect other connections and resets when the session ends.

## Disabling Globally at Runtime

To disable for all new connections without restarting MySQL:

```sql
SET GLOBAL sql_mode = REPLACE(@@GLOBAL.sql_mode, 'ONLY_FULL_GROUP_BY,', '');
```

Verify the change:

```sql
SHOW GLOBAL VARIABLES LIKE 'sql_mode';
```

Note: this change does not persist across server restarts.

## Disabling Persistently in my.cnf

To make the change permanent, edit the `[mysqld]` section of your MySQL configuration file:

```ini
[mysqld]
sql_mode = STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

This preserves the other important modes while removing `ONLY_FULL_GROUP_BY`. Restart MySQL to apply:

```bash
sudo systemctl restart mysql
```

## Using MySQL 8.0 Persisted Variables

MySQL 8.0 supports persisted system variables that survive restarts:

```sql
SET PERSIST sql_mode = REPLACE(@@GLOBAL.sql_mode, 'ONLY_FULL_GROUP_BY,', '');
```

This writes the setting to `mysqld-auto.cnf` and applies it after each restart. No manual `my.cnf` edit required.

## Better Alternative: Fix the Queries

Before disabling the mode entirely, consider fixing the offending queries. MySQL provides `ANY_VALUE()` for this purpose:

```sql
-- Non-compliant query
SELECT customer_id, name, MAX(order_date)
FROM orders
GROUP BY customer_id;

-- Fixed with ANY_VALUE for the non-deterministic column
SELECT customer_id, ANY_VALUE(name) AS name, MAX(order_date)
FROM orders
GROUP BY customer_id;
```

For queries where you want a deterministic result, add the column to the GROUP BY clause:

```sql
SELECT customer_id, name, MAX(order_date)
FROM orders
GROUP BY customer_id, name;
```

## Checking Which Queries Fail

To identify all failing queries in a test environment, enable the mode and run your application test suite:

```sql
SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',ONLY_FULL_GROUP_BY');
-- Run application tests
```

Capture the errors and fix them systematically before deploying to production.

## Summary

Disabling `ONLY_FULL_GROUP_BY` is sometimes necessary for legacy application compatibility, but it should be a temporary measure. Use `SET PERSIST` in MySQL 8.0 for a clean approach that survives restarts without manual config edits, and work toward fixing the underlying queries using `ANY_VALUE()` or proper GROUP BY columns. Keeping this mode enabled ensures your queries return deterministic, standards-compliant results.
