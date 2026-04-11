# How to Perform a MySQL Upgrade Readiness Check

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, Readiness, Administration, Migration

Description: Learn how to perform a MySQL upgrade readiness check using mysqlcheck, MySQL Shell, and the sys schema to identify compatibility issues before upgrading.

---

Before upgrading MySQL - especially from 5.7 to 8.0 - you should perform a thorough readiness check to identify compatibility issues that will cause the upgrade to fail or break your application. This guide covers the key checks and tools to use.

## Using mysqlcheck --check-upgrade

The most direct check is `mysqlcheck` with the `--check-upgrade` flag:

```bash
mysqlcheck -u root -p --check-upgrade --all-databases
```

This runs `CHECK TABLE ... FOR UPGRADE` on every table and reports tables that need attention. Common issues include:

- Tables using removed features
- Temporal columns needing format upgrades
- Tables using deprecated character sets

## Using MySQL Shell Upgrade Checker (5.7 to 8.0)

MySQL Shell provides a comprehensive compatibility checker for 5.7 to 8.0 upgrades:

```bash
mysqlsh -- util check-for-server-upgrade root@localhost:3306 --output-format=TEXT --target-version=8.0
```

Or interactively:

```bash
mysqlsh
```

```javascript
util.checkForServerUpgrade('root@localhost:3306', {targetVersion: '8.0'})
```

The checker examines:
- Usage of keywords that became reserved in 8.0
- Table definitions with `ZEROFILL` or display widths on integer types
- Partitioned tables using non-native partitioning
- Authentication plugins that changed behavior

## Checking for Reserved Word Conflicts

MySQL 8.0 added many new reserved words. Check if any table, column, or database names conflict:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE COLUMN_NAME IN (
  'RANK', 'GROUPS', 'SYSTEM', 'LATERAL', 'EXCEPT',
  'CUBE', 'CUME_DIST', 'DENSE_RANK', 'FIRST_VALUE',
  'LAG', 'LAST_VALUE', 'LEAD', 'NTH_VALUE', 'NTILE',
  'OVER', 'PERCENT_RANK', 'ROW_NUMBER', 'WINDOW'
)
ORDER BY TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME;
```

Any columns with these names will need backtick quoting in 8.0.

## Checking Default Authentication Plugin

MySQL 8.0 changed the default authentication plugin from `mysql_native_password` to `caching_sha2_password`. Check existing users:

```sql
SELECT user, host, plugin
FROM mysql.user
WHERE plugin = 'mysql_native_password';
```

Applications using old client libraries may need updating to support `caching_sha2_password`.

## Checking for Unsupported SQL Modes

Some SQL modes were removed in MySQL 8.0. Check your current mode:

```sql
SELECT @@sql_mode;
```

Modes removed in 8.0 include `NO_AUTO_CREATE_USER` and `NO_FIELD_OPTIONS`. If present, remove them from `my.cnf` before upgrading.

## Checking Stored Objects for Compatibility

```sql
SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_DEFINITION LIKE '%NO_AUTO_CREATE_USER%'
   OR ROUTINE_DEFINITION LIKE '%@@global.query_cache%';
```

Stored procedures and functions using removed features will fail after upgrade.

## Checking Data Types

MySQL 8.0 deprecated integer display widths. Find affected columns:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE COLUMN_TYPE REGEXP 'int\\([0-9]+\\)'
  AND TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys');
```

These will generate warnings in 8.0 but still function correctly.

## Summary

A thorough MySQL upgrade readiness check uses `mysqlcheck --check-upgrade` for table-level issues, MySQL Shell's `checkForServerUpgrade` utility for comprehensive 5.7-to-8.0 compatibility analysis, and manual SQL queries to identify reserved word conflicts, authentication plugin mismatches, and removed SQL mode usage. Run these checks on a copy of production data in a staging environment and resolve all issues before scheduling the production upgrade window.
