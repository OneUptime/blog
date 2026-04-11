# How to Use STRICT_TRANS_TABLES SQL Mode in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Mode, Strict Mode, Data Validation, Configuration

Description: Learn how STRICT_TRANS_TABLES SQL mode in MySQL enforces data integrity by rejecting invalid values instead of silently converting them.

---

`STRICT_TRANS_TABLES` is one of the most important SQL modes in MySQL. Without it, MySQL silently converts invalid or out-of-range values - for example, inserting an empty string into an integer column stores `0` without any error. With this mode enabled, MySQL rejects the insert and returns an error, protecting your data integrity.

## What STRICT_TRANS_TABLES Does

When `STRICT_TRANS_TABLES` is active, MySQL returns an error rather than a warning for:

- Values that exceed column length limits
- Out-of-range numeric values
- NULL values inserted into NOT NULL columns without a default
- Invalid date values like `2024-02-30`
- Empty strings inserted into numeric columns

For transactional tables (InnoDB), the entire statement is rolled back. For non-transactional tables (like MyISAM), the statement aborts if the bad value is in the first row. If a bad value occurs in a subsequent row, MySQL adjusts it to the closest valid value and issues a warning instead of an error.

## Checking Whether the Mode Is Active

```sql
SELECT @@sql_mode LIKE '%STRICT_TRANS_TABLES%';
```

Or list the full mode:

```sql
SHOW VARIABLES LIKE 'sql_mode'\G
```

## Enabling STRICT_TRANS_TABLES

Enable it for all new connections:

```sql
SET GLOBAL sql_mode = CONCAT(@@GLOBAL.sql_mode, ',STRICT_TRANS_TABLES');
```

Or set the session:

```sql
SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',STRICT_TRANS_TABLES');
```

Persist the setting in `my.cnf`:

```ini
[mysqld]
sql_mode = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
```

## Behavior Comparison

Without strict mode, this insert succeeds silently:

```sql
SET SESSION sql_mode = '';
CREATE TABLE test (val INT NOT NULL);
INSERT INTO test (val) VALUES ('abc');
-- Query OK, 1 row affected, 1 warning
-- val stored as 0
```

With strict mode, the same insert fails:

```sql
SET SESSION sql_mode = 'STRICT_TRANS_TABLES';
INSERT INTO test (val) VALUES ('abc');
-- ERROR 1366 (HY000): Incorrect integer value: 'abc' for column 'val' at row 1
```

## Handling Existing Application Code

If you enable strict mode on an existing application, you may encounter errors from queries that previously relied on silent adjustments. To identify these before enabling globally, run your application's test suite with the mode enabled per session:

```sql
SET SESSION sql_mode = 'STRICT_TRANS_TABLES';
-- Run your application queries here
```

Common patterns to fix:
- Replace empty string defaults with `0` or `NULL` for numeric columns
- Validate date inputs before insertion
- Add proper `NOT NULL` constraints with meaningful defaults

## STRICT_ALL_TABLES vs STRICT_TRANS_TABLES

`STRICT_ALL_TABLES` extends strict enforcement to non-transactional tables as well. With `STRICT_ALL_TABLES`, multi-row inserts into MyISAM tables abort at the first error and do not roll back rows already inserted, resulting in a partial update. With `STRICT_TRANS_TABLES`, the statement aborts if the bad value is in the first row, but if a bad value occurs in a later row, MySQL adjusts it to the closest valid value and issues a warning rather than an error.

For production systems using InnoDB exclusively, `STRICT_TRANS_TABLES` provides the same protection with slightly different behavior for edge cases involving mixed-engine queries.

## Summary

`STRICT_TRANS_TABLES` is a critical safeguard that prevents MySQL from silently corrupting data by adjusting invalid values. It is enabled by default in MySQL 8.0 and should remain enabled in any production environment. If you are upgrading from an older system where it was disabled, audit your application code for reliance on lenient insert behavior before enabling it.
