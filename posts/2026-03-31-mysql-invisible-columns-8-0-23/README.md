# How to Use Invisible Columns in MySQL 8.0.23

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Column, Schema, DDL, Feature

Description: MySQL 8.0.23 introduced invisible columns that are hidden from SELECT * and most queries but accessible when explicitly referenced, enabling schema evolution without breaking applications.

---

## Overview

Invisible columns, introduced in MySQL 8.0.23, allow you to add columns to a table that are excluded from `SELECT *` results and do not need to be specified in `INSERT` statements that omit column lists. This feature lets you add new columns to tables used by applications that rely on positional column references or `SELECT *` without breaking those applications. The column exists in the table and can be read and written when referenced by name - it is simply hidden from implicit queries.

## Creating a Table With an Invisible Column

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  internal_notes TEXT INVISIBLE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

`internal_notes` is invisible: a `SELECT *` will not return it, and `INSERT INTO orders VALUES (...)` will not require it.

## Adding an Invisible Column to an Existing Table

```sql
ALTER TABLE users
  ADD COLUMN legacy_id BIGINT INVISIBLE AFTER id;
```

This is useful when migrating data from a legacy system - you can store the old ID without surfacing it to the application.

## Behavior With SELECT *

```sql
-- Does NOT return internal_notes
SELECT * FROM orders LIMIT 1;

-- Returns internal_notes when explicitly named
SELECT id, customer_id, total, internal_notes FROM orders LIMIT 1;
```

## Behavior With INSERT

```sql
-- Works - internal_notes is skipped
INSERT INTO orders (customer_id, total) VALUES (42, 99.99);

-- To set an invisible column, reference it explicitly
INSERT INTO orders (customer_id, total, internal_notes)
VALUES (42, 99.99, 'VIP customer - expedite');
```

## Checking Column Visibility

```sql
SELECT column_name, column_type, extra
FROM information_schema.columns
WHERE table_schema = 'myapp'
  AND table_name = 'orders';
```

The `EXTRA` column will show `INVISIBLE` for hidden columns.

## Making a Column Visible Again

```sql
ALTER TABLE orders
  ALTER COLUMN internal_notes SET VISIBLE;
```

## Making an Existing Column Invisible

```sql
ALTER TABLE orders
  ALTER COLUMN internal_notes SET INVISIBLE;
```

## Practical Use Cases

**Phased column rollout**: Add a new column as invisible while you deploy application code that reads from it. Once deployed, make the column visible.

```sql
-- Phase 1: add column, deploy app code
ALTER TABLE products ADD COLUMN weight_kg DECIMAL(8,3) INVISIBLE DEFAULT 0;

-- Phase 2: after app is updated
ALTER TABLE products ALTER COLUMN weight_kg SET VISIBLE;
```

**Internal audit fields**: Store metadata columns like `row_version` or `updated_by_system` that are maintained internally and should not appear in application queries.

```sql
ALTER TABLE inventory
  ADD COLUMN row_version INT NOT NULL DEFAULT 1 INVISIBLE;
```

## Limitations

- A table cannot have only invisible columns - at least one visible column is required.
- Invisible columns are still physically stored and occupy space.
- They appear in `SHOW CREATE TABLE` output, so DBAs can always see them.
- `DESCRIBE tablename` shows invisible columns with `INVISIBLE` in the `Extra` field.

## Summary

Invisible columns are a practical MySQL 8.0.23 feature for safe schema evolution. By hiding new or internal columns from `SELECT *` and unspecified `INSERT` statements, you can add columns to live tables without requiring simultaneous application changes. This reduces deployment coordination overhead and makes it easier to introduce new fields incrementally.
