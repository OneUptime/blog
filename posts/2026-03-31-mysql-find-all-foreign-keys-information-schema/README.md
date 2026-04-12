# How to Find All Foreign Keys Using INFORMATION_SCHEMA in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Foreign Key, Constraint, Database Administration

Description: Learn how to list all foreign key constraints in MySQL using INFORMATION_SCHEMA, including parent-child relationships and cascading actions.

---

## Why Query Foreign Keys via INFORMATION_SCHEMA?

MySQL stores foreign key metadata in `INFORMATION_SCHEMA.KEY_COLUMN_USAGE` and `INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS`. Querying these tables is the most reliable way to enumerate all foreign key relationships across your database schema - without parsing `SHOW CREATE TABLE` output for every table.

This is invaluable when documenting schemas, debugging constraint errors, or planning data migrations.

## Key Views for Foreign Key Metadata

- `INFORMATION_SCHEMA.KEY_COLUMN_USAGE` - maps columns to constraints, including foreign key columns and their referenced columns
- `INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS` - includes `UPDATE_RULE` and `DELETE_RULE` (CASCADE, SET NULL, RESTRICT, etc.)
- `INFORMATION_SCHEMA.TABLE_CONSTRAINTS` - lists all constraint types including FOREIGN KEY

## List All Foreign Keys in a Database

```sql
SELECT
    kcu.TABLE_NAME,
    kcu.COLUMN_NAME,
    kcu.CONSTRAINT_NAME,
    kcu.REFERENCED_TABLE_NAME,
    kcu.REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
  AND kcu.TABLE_SCHEMA = 'mydb'
ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME;
```

## Include CASCADE Rules

Join with `REFERENTIAL_CONSTRAINTS` to see update and delete behavior:

```sql
SELECT
    kcu.TABLE_NAME AS child_table,
    kcu.COLUMN_NAME AS child_column,
    kcu.REFERENCED_TABLE_NAME AS parent_table,
    kcu.REFERENCED_COLUMN_NAME AS parent_column,
    kcu.CONSTRAINT_NAME,
    rc.UPDATE_RULE,
    rc.DELETE_RULE
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
    ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
    AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
  AND kcu.TABLE_SCHEMA = 'mydb'
ORDER BY kcu.TABLE_NAME;
```

## Find All Tables That Reference a Specific Table

Useful before dropping or truncating a parent table:

```sql
SELECT
    kcu.TABLE_NAME AS referencing_table,
    kcu.COLUMN_NAME AS referencing_column,
    kcu.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
WHERE kcu.REFERENCED_TABLE_NAME = 'customers'
  AND kcu.TABLE_SCHEMA = 'mydb';
```

## Find All Foreign Keys with CASCADE DELETE

```sql
SELECT
    kcu.TABLE_NAME,
    kcu.COLUMN_NAME,
    kcu.REFERENCED_TABLE_NAME,
    rc.DELETE_RULE
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
    ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
    AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
  AND rc.DELETE_RULE = 'CASCADE'
  AND kcu.TABLE_SCHEMA = 'mydb';
```

## Find Tables With No Foreign Keys (Potentially Orphaned)

```sql
SELECT
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT IN (
    SELECT DISTINCT TABLE_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_SCHEMA = 'mydb'
  )
ORDER BY TABLE_NAME;
```

## Generate DROP FOREIGN KEY Statements

To remove foreign key constraints before bulk operations or schema changes:

```sql
SELECT
    CONCAT(
        'ALTER TABLE `', TABLE_NAME, '` ',
        'DROP FOREIGN KEY `', CONSTRAINT_NAME, '`;'
    ) AS drop_fk_sql
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME IS NOT NULL
  AND TABLE_SCHEMA = 'mydb';
```

## Summary

`INFORMATION_SCHEMA.KEY_COLUMN_USAGE` combined with `INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS` gives you a complete map of foreign key relationships in your MySQL database. Use these queries for schema documentation, pre-migration analysis, cascade rule audits, and generating scripts to manage constraints programmatically.
