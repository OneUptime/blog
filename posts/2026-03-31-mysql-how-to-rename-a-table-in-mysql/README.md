# How to Rename a Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, ALTER TABLE, Schema Design

Description: Learn how to rename a table in MySQL using RENAME TABLE or ALTER TABLE RENAME, with tips on handling foreign keys and application dependencies.

---

## Two Ways to Rename a Table

MySQL provides two equivalent syntaxes:

1. `RENAME TABLE` - the preferred, cleaner syntax
2. `ALTER TABLE ... RENAME TO` - alternative syntax

## Using RENAME TABLE

```sql
RENAME TABLE old_table_name TO new_table_name;
```

```sql
-- Example
RENAME TABLE usr TO users;
```

## Using ALTER TABLE RENAME TO

```sql
ALTER TABLE old_table_name
RENAME TO new_table_name;
```

Both syntaxes are atomic - the rename either fully succeeds or fully fails.

## Renaming Multiple Tables in One Statement

`RENAME TABLE` can rename multiple tables atomically:

```sql
RENAME TABLE
    old_users     TO users,
    old_products  TO products,
    old_orders    TO orders;
```

This is useful when swapping table names (e.g., deploying a new table version).

## Atomic Table Swap Pattern

A common production technique for zero-downtime schema changes is to swap a new table into place:

```sql
-- Build the new table structure and populate it
CREATE TABLE users_new LIKE users;
-- ... populate users_new ...

-- Atomically swap old and new
RENAME TABLE
    users     TO users_old,
    users_new TO users;

-- Verify, then drop the old table
DROP TABLE users_old;
```

## Moving a Table to a Different Database

`RENAME TABLE` can move a table to another database in the same MySQL instance:

```sql
RENAME TABLE current_db.my_table TO target_db.my_table;
```

Note: this does not copy data - it physically moves the table's files. Both databases must exist.

## Impact on Views, Foreign Keys, and Stored Procedures

Renaming a table does NOT automatically update:
- Views that reference the table
- Stored procedures and functions that reference the table
- Application queries

Foreign key constraints that reference the renamed table ARE automatically updated by MySQL.

Check dependencies before renaming:

```sql
-- Find views referencing the table
SELECT TABLE_NAME, VIEW_DEFINITION
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = DATABASE()
  AND VIEW_DEFINITION LIKE '%old_table_name%';

-- Find stored procedures/functions
SELECT ROUTINE_NAME, ROUTINE_TYPE
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_DEFINITION LIKE '%old_table_name%';
```

## Rename Permission Requirements

The user must have `ALTER` and `DROP` privileges on the old table and `CREATE` and `INSERT` privileges on the new name.

## Verifying the Rename

```sql
SHOW TABLES LIKE 'users%';

-- Or check information schema
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users';
```

## Summary

`RENAME TABLE old TO new` is the cleanest way to rename a table in MySQL. It is atomic, supports renaming multiple tables in one statement, and can move tables between databases on the same instance. The operation does not update references in views or stored procedures, so those must be updated separately. Foreign key constraints referencing the renamed table are automatically updated by MySQL. Use the atomic multi-table rename for zero-downtime table swap deployments.
