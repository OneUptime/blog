# How to Use DESCRIBE (DESC) Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DESCRIBE, Database Inspection, DDL

Description: Learn how to use the DESCRIBE and DESC statements in MySQL to inspect table structure, column definitions, data types, and key information.

---

## What Is DESCRIBE in MySQL

The `DESCRIBE` (abbreviated `DESC`) statement displays information about the columns in a table or view, including column names, data types, nullability, default values, keys, and extra attributes. It is one of the quickest ways to inspect a table's schema without writing a full `SHOW CREATE TABLE` or querying `information_schema`.

`DESCRIBE` is equivalent to `EXPLAIN` when used with a table name, and it can also be used with a query to show the execution plan.

## Basic Syntax

```sql
DESCRIBE table_name;
-- or
DESC table_name;
```

To describe a specific column:

```sql
DESCRIBE table_name column_name;
DESCRIBE table_name 'col_%';  -- supports LIKE patterns
```

## Describing a Table

```sql
DESCRIBE orders;
```

Sample output:

```text
+-------------+--------------+------+-----+---------+----------------+
| Field       | Type         | Null | Key | Default | Extra          |
+-------------+--------------+------+-----+---------+----------------+
| id          | int          | NO   | PRI | NULL    | auto_increment |
| customer_id | int          | NO   | MUL | NULL    |                |
| status      | varchar(20)  | YES  |     | active  |                |
| total       | decimal(10,2) | NO   |     | 0.00    |                |
| created_at  | datetime     | NO   |     | NULL    |                |
+-------------+--------------+------+-----+---------+----------------+
```

Column meanings:

- `Field` - column name
- `Type` - data type including size/precision
- `Null` - YES if the column accepts NULL
- `Key` - PRI (primary key), UNI (unique), MUL (indexed)
- `Default` - default value if any
- `Extra` - auto_increment, ON UPDATE, generated columns, etc.

## Describing a Specific Column

```sql
DESCRIBE orders status;
```

```text
+--------+-------------+------+-----+---------+-------+
| Field  | Type        | Null | Key | Default | Extra |
+--------+-------------+------+-----+---------+-------+
| status | varchar(20) | YES  |     | active  |       |
+--------+-------------+------+-----+---------+-------+
```

## Describing a View

`DESCRIBE` works the same way on views:

```sql
CREATE VIEW active_orders AS
    SELECT id, customer_id, total FROM orders WHERE status = 'active';

DESCRIBE active_orders;
```

## Using DESCRIBE with a Query (EXPLAIN)

When used with a SELECT statement, `DESC` is a synonym for `EXPLAIN`:

```sql
DESC SELECT * FROM orders WHERE customer_id = 42;
-- Same as:
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
```

This shows the query execution plan, including index usage.

## Comparing DESCRIBE vs SHOW CREATE TABLE

`DESCRIBE` provides a quick column summary, while `SHOW CREATE TABLE` gives the full DDL:

```sql
-- Quick column overview
DESCRIBE orders;

-- Full table definition including indexes and constraints
SHOW CREATE TABLE orders\G
```

Use `DESCRIBE` for interactive exploration, and `SHOW CREATE TABLE` when you need to replicate or audit the exact schema.

## Querying information_schema for Column Details

For programmatic access or more detailed filtering, query `information_schema.columns`:

```sql
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    column_key,
    extra
FROM information_schema.columns
WHERE table_schema = 'mydb'
  AND table_name = 'orders'
ORDER BY ordinal_position;
```

## Using DESC to Check Column Types Before Migration

Before a schema migration, use `DESCRIBE` to verify existing types:

```sql
DESCRIBE users;
-- Check if 'phone' column exists and its current type

-- Then alter if needed
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20);

-- Verify the change
DESCRIBE users phone;
```

## Summary

The `DESCRIBE` (or `DESC`) statement is a fast, readable way to inspect table and view column definitions in MySQL. It shows column names, data types, nullability, keys, defaults, and extra attributes at a glance. For full DDL inspection use `SHOW CREATE TABLE`, and for programmatic access use `information_schema.columns`.
