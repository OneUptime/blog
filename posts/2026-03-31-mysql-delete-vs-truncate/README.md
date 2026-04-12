# How to Choose Between DELETE and TRUNCATE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Delete, TRUNCATE, InnoDB, Performance

Description: Understand the key differences between DELETE and TRUNCATE in MySQL so you can choose the right command for clearing table data safely and efficiently.

---

## The Core Difference

Both `DELETE` and `TRUNCATE` remove rows from a table, but they work in fundamentally different ways:

- `DELETE` is a DML (Data Manipulation Language) statement. It removes rows one at a time (or in pages), fires triggers, generates undo log entries, and can be rolled back.
- `TRUNCATE` is a DDL (Data Definition Language) statement. It drops and recreates the table storage, bypasses row-level processing, does not fire triggers, and cannot be rolled back inside a transaction.

## Basic Syntax

```sql
-- Delete all rows (can add WHERE, LIMIT, ORDER BY)
DELETE FROM orders;

-- Remove all rows faster, reset auto-increment
TRUNCATE TABLE orders;
```

## Performance Comparison

For tables with millions of rows, `TRUNCATE` is dramatically faster:

```sql
-- Slow: scans and logs every row
DELETE FROM temp_imports;

-- Fast: drops and recreates storage pages
TRUNCATE TABLE temp_imports;
```

`DELETE` generates one undo log entry per row, which grows the InnoDB undo tablespace and makes rollback possible. `TRUNCATE` skips all of that.

## AUTO_INCREMENT Behavior

`TRUNCATE` resets the `AUTO_INCREMENT` counter to 1. `DELETE` does not:

```sql
TRUNCATE TABLE users;
-- Next insert gets id = 1

DELETE FROM users;
-- Next insert continues from where the counter left off
```

This distinction matters when other tables reference the user IDs as foreign keys or when external systems expect monotonically increasing IDs.

## Trigger Behavior

`DELETE` fires `BEFORE DELETE` and `AFTER DELETE` triggers on each removed row. `TRUNCATE` does not fire any triggers:

```sql
CREATE TRIGGER audit_delete
BEFORE DELETE ON orders
FOR EACH ROW
INSERT INTO audit (action, record_id) VALUES ('delete', OLD.id);

-- This fires the trigger for each row:
DELETE FROM orders WHERE status = 'cancelled';

-- This fires NO triggers:
TRUNCATE TABLE orders;
```

## Transaction and Rollback Behavior

`DELETE` can be rolled back within a transaction:

```sql
START TRANSACTION;
DELETE FROM temp_data WHERE batch = 42;
-- Something went wrong:
ROLLBACK;
-- Rows are restored
```

`TRUNCATE` causes an implicit commit before and after executing, so it cannot be rolled back:

```sql
START TRANSACTION;
TRUNCATE TABLE temp_data;
ROLLBACK;
-- Rows are GONE - TRUNCATE committed implicitly
```

## Foreign Key Constraints

`TRUNCATE` fails if the table is referenced by a foreign key constraint, even if the referencing table is empty:

```sql
-- Fails if orders references customers via foreign key:
TRUNCATE TABLE customers;

-- Works (removes rows but respects foreign keys row by row):
DELETE FROM customers WHERE id = 5;
```

## Decision Guide

| Need | Use |
|---|---|
| Remove specific rows | DELETE with WHERE |
| Remove all rows, keep triggers, stay in transaction | DELETE without WHERE |
| Fastest full-table wipe, reset auto-increment | TRUNCATE |
| Table has foreign key references | DELETE |
| Staging or temporary table cleanup | TRUNCATE |

## Summary

Use `TRUNCATE` when you need the fastest way to empty a table and do not need triggers, rollback capability, or foreign key enforcement. Use `DELETE` when you need to remove specific rows, fire triggers, stay within a transaction, or handle tables with foreign key references.
