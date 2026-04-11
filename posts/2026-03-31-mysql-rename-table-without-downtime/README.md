# How to Rename a Table Without Downtime in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, RENAME TABLE, Zero Downtime, Migration

Description: Learn how to rename a MySQL table without downtime using atomic RENAME TABLE, synonyms, and backward-compatible deploy strategies.

---

Renaming a table in production requires careful coordination with application deployments to avoid errors during the cutover. MySQL's `RENAME TABLE` is atomic and very fast, but the application must handle the old and new name simultaneously during the transition.

## The Basic RENAME TABLE Command

```sql
RENAME TABLE old_name TO new_name;
```

This is a metadata-only operation - no rows are moved. The rename is atomic, meaning concurrent queries either see the old name or the new name but never an inconsistent state.

## Renaming With Indexes and Foreign Keys

Indexes keep their original names but continue to function on the renamed table. In MySQL 8.0+, foreign key constraints that reference the renamed table are automatically updated. You can verify this with:

```sql
-- Check for foreign keys referencing the table
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM   information_schema.KEY_COLUMN_USAGE
WHERE  REFERENCED_TABLE_NAME = 'old_name'
  AND  TABLE_SCHEMA = DATABASE();
```

```sql
-- If a conflict occurs (e.g., renamed constraint name already exists), manually update:
ALTER TABLE child_table
    DROP FOREIGN KEY fk_old,
    ADD CONSTRAINT fk_new FOREIGN KEY (col) REFERENCES new_name (id);
```

## Zero-Downtime Strategy With a View Alias

Create a view with the old name that queries the new name. Applications using the old name keep working transparently.

```sql
-- Step 1: rename the physical table
RENAME TABLE orders TO purchase_orders;

-- Step 2: create a compatibility view with the old name
CREATE VIEW orders AS SELECT * FROM purchase_orders;
```

Since this view is a simple `SELECT *` from a single table, it is an updatable view and supports INSERT, UPDATE, and DELETE in addition to SELECT.

## Zero-Downtime Strategy With Dual-Write

For write-heavy tables, use a dual-write migration pattern:

```sql
-- Phase 1: create the new table and keep both in sync via triggers
CREATE TABLE purchase_orders LIKE orders;

DELIMITER $$
CREATE TRIGGER trg_orders_sync AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    INSERT INTO purchase_orders SELECT * FROM orders WHERE id = NEW.id
    ON DUPLICATE KEY UPDATE status = NEW.status;
END$$
DELIMITER ;
```

Deploy the application reading from `purchase_orders`. Once stable, drop the trigger and the old table.

## Atomic Swap of Two Tables

Rename two tables simultaneously in one statement - useful for deploying a rebuilt table:

```sql
-- Build new_orders as the replacement for orders, then swap atomically
RENAME TABLE orders TO orders_old, new_orders TO orders;
```

The swap happens atomically. You can then drop `orders_old` after verifying the new table is working.

## Checking Active Queries Before Rename

```sql
-- Check for long-running queries on the table before renaming
SELECT ID, USER, HOST, DB, TIME, INFO
FROM   information_schema.PROCESSLIST
WHERE  INFO LIKE '%orders%'
  AND  TIME > 5;
```

Kill any blocking queries before proceeding with the rename to avoid metadata lock waits.

## Summary

`RENAME TABLE` is atomic and fast in MySQL. For zero-downtime renames, create a compatibility view with the old name after renaming the physical table. For write-heavy tables, use dual-write triggers or the atomic two-table swap pattern. Always check for foreign key dependencies and update them after the rename.
