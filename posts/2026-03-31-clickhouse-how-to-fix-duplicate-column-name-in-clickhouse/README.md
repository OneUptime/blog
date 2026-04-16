# How to Fix 'Duplicate column name' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Schema, Troubleshooting

Description: Fix 'Duplicate column name' errors in ClickHouse by aliasing columns, rewriting SELECT statements, and understanding how joins produce duplicates.

---

## Understanding the Error

ClickHouse raises a "Duplicate column name" error when a query produces a result set with two or more columns sharing the same name:

```text
Code: 15. DB::Exception: Duplicate column name 'user_id' in CREATE TABLE.
```

Or during a query:

```text
Code: 15. DB::Exception: Duplicate column name 'id'.
```

This is stricter than some other databases that silently allow duplicate column names in result sets.

## Common Causes

- `SELECT *` across a JOIN where both tables have columns with the same name
- `SELECT *, additional_col` where `additional_col` already exists in the table
- CREATE TABLE with two columns sharing the same name
- UNION ALL where both branches have a column with duplicate names in the same branch
- Subquery or CTE that returns duplicate column names

## Diagnosing Duplicate Columns in Queries

```sql
-- This will fail if both tables have a column named 'id' or 'user_id'
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.id;

-- To see which columns conflict, describe each table
DESCRIBE TABLE orders;
DESCRIBE TABLE customers;
```

## Fix 1 - Use Column Aliases in SELECT *

```sql
-- Instead of SELECT *, list columns explicitly with aliases
SELECT
    o.id AS order_id,
    o.customer_id,
    o.amount,
    c.id AS customer_id_ref,
    c.name AS customer_name,
    c.email
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

## Fix 2 - Use EXCEPT to Remove Duplicate Columns

ClickHouse supports `SELECT * EXCEPT (col)` to remove specific columns:

```sql
-- Remove the duplicate column from one side of the join
SELECT
    o.*,
    c.* EXCEPT (id)
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

## Fix 3 - Use USING Instead of ON for Joins

When using `USING`, ClickHouse automatically merges the duplicate join key into one column:

```sql
-- USING deduplicates the join key column
SELECT *
FROM orders
JOIN customers USING (customer_id);
-- Result has only one 'customer_id' column
```

## Fix 4 - Fix Duplicate Column Names in CREATE TABLE

```sql
-- This fails:
CREATE TABLE bad_table (
    id UInt64,
    name String,
    id String  -- duplicate!
) ENGINE = MergeTree()
ORDER BY id;

-- Fix: rename or remove the duplicate
CREATE TABLE good_table (
    id UInt64,
    name String,
    external_id String
) ENGINE = MergeTree()
ORDER BY id;
```

## Fix 5 - Fix Duplicates in Subqueries and CTEs

```sql
-- CTE that produces duplicate column names
-- This fails:
WITH enriched AS (
    SELECT
        e.*,
        u.name,
        u.name AS display_name  -- duplicate if e also has 'display_name'
    FROM events e
    JOIN users u ON e.user_id = u.id
)
SELECT * FROM enriched;

-- Fix: use explicit aliasing
WITH enriched AS (
    SELECT
        e.id AS event_id,
        e.timestamp,
        e.event_type,
        u.name AS user_name,
        u.email
    FROM events e
    JOIN users u ON e.user_id = u.id
)
SELECT * FROM enriched;
```

## Fix 6 - Fix SELECT * with Additional Computed Columns

```sql
-- Fails if 'total' column already exists in orders
SELECT *, price * quantity AS total
FROM orders;

-- Fix: exclude or alias
SELECT
    * EXCEPT (total),
    price * quantity AS total
FROM orders;

-- Or just be explicit
SELECT
    id,
    price,
    quantity,
    price * quantity AS total
FROM orders;
```

## Checking for Duplicate Columns in a Table

```sql
-- Find tables with duplicate column names (should not exist, but helpful after migrations)
SELECT
    database,
    table,
    name AS column_name,
    count() AS count
FROM system.columns
WHERE database = 'your_database'
GROUP BY database, table, name
HAVING count > 1;
```

## Summary

"Duplicate column name" errors in ClickHouse occur when a query or schema produces two columns with the same name. Fix query-level duplicates by using explicit column aliases, `SELECT * EXCEPT (col)`, or the `USING` clause for joins. For schema-level duplicates in CREATE TABLE, rename the conflicting columns. Always prefer explicit column lists over `SELECT *` in production queries.
