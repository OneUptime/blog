# How to Use Data Dictionary in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Dictionary, Information Schema, Database Administration

Description: Explore how MySQL 8's transactional data dictionary works, how it replaces .frm files, and how to query metadata using Information Schema.

---

## What Is the Data Dictionary in MySQL 8

MySQL 8 introduced a unified, transactional data dictionary that stores all metadata about database objects - tables, columns, indexes, stored routines, and more - directly in InnoDB tables. This replaced the legacy system of `.frm`, `.par`, and `.opt` files used in MySQL 5.7 and earlier.

Key benefits:
- Metadata changes are now transactional (atomic, consistent, isolated, durable).
- Faster schema operations since metadata lives in InnoDB and benefits from its caching.
- No more `.frm` file corruption issues.

## Querying the Data Dictionary via Information Schema

The primary interface to the data dictionary is the `INFORMATION_SCHEMA` views. You do not query the underlying InnoDB system tables directly.

### List All Tables in a Database

```sql
SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS, CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'myapp'
ORDER BY TABLE_NAME;
```

### List All Columns for a Table

```sql
SELECT COLUMN_NAME, ORDINAL_POSITION, COLUMN_DEFAULT,
       IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
       COLUMN_KEY, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'myapp'
  AND TABLE_NAME = 'orders'
ORDER BY ORDINAL_POSITION;
```

### List All Indexes on a Table

```sql
SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'myapp'
  AND TABLE_NAME = 'orders'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;
```

## Querying Stored Routines

```sql
SELECT ROUTINE_NAME, ROUTINE_TYPE, CREATED, LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp';
```

## Querying Foreign Keys

```sql
SELECT
  kcu.CONSTRAINT_NAME,
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  kcu.REFERENCED_TABLE_NAME,
  kcu.REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
  ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
  AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND kcu.TABLE_SCHEMA = 'myapp';
```

## Checking Views

```sql
SELECT TABLE_NAME AS VIEW_NAME, VIEW_DEFINITION
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = 'myapp';
```

## Using SHOW Statements as Shortcuts

MySQL also exposes data dictionary information through `SHOW` commands, which internally query the data dictionary:

```sql
SHOW TABLES FROM myapp;
SHOW COLUMNS FROM myapp.orders;
SHOW INDEX FROM myapp.orders;
SHOW CREATE TABLE myapp.orders;
```

## MySQL 8 Performance Improvements in Information Schema

In MySQL 8, many `INFORMATION_SCHEMA` queries are faster because the data dictionary is stored in InnoDB with proper indexes rather than being reconstructed from `.frm` files on every query.

The underlying data dictionary tables (such as `tables`, `columns`, `indexes`, and `routines`) exist in the `mysql` schema but are hidden - they are not visible through `INFORMATION_SCHEMA` queries or `SHOW TABLES`, and cannot be queried directly with `SELECT`. The `INFORMATION_SCHEMA` views are the only supported interface for accessing data dictionary metadata.

## Practical Example - Auditing Schema Changes

You can use the data dictionary to detect recently modified tables:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, CREATE_TIME, UPDATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
  AND (CREATE_TIME > NOW() - INTERVAL 7 DAY
       OR UPDATE_TIME > NOW() - INTERVAL 7 DAY)
ORDER BY COALESCE(UPDATE_TIME, CREATE_TIME) DESC;
```

## Summary

MySQL 8's transactional data dictionary eliminates legacy `.frm` file management and provides a reliable, consistent metadata store backed by InnoDB. Use `INFORMATION_SCHEMA` views to query schema metadata for auditing, documentation, and automation tasks. The improved internals also mean faster metadata operations compared to MySQL 5.7.
