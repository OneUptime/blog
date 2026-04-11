# How to Use TABLE and VALUES Statements in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, SQL, Table, Value

Description: Learn how MySQL 8.0 TABLE and VALUES statements simplify queries by providing shorthand syntax for full table scans and inline row sets.

---

## Introduction to TABLE and VALUES

MySQL 8.0.19 introduced two new SQL statements borrowed from the SQL standard: `TABLE` and `VALUES`. These are syntactic shortcuts that reduce verbosity for common patterns and open up new compositional possibilities.

## The TABLE Statement

The `TABLE` statement is equivalent to `SELECT * FROM table_name` with no `WHERE` clause. It returns all rows and all columns from a table.

```sql
-- Traditional full table select
SELECT * FROM products;

-- Equivalent using TABLE statement
TABLE products;
```

While functionally identical to `SELECT *`, `TABLE` can be combined with `ORDER BY` and `LIMIT`:

```sql
-- Return first 10 products ordered by name
TABLE products ORDER BY name LIMIT 10;

-- Return last 5 products by price
TABLE products ORDER BY price DESC LIMIT 5;
```

## Using TABLE in UNION

One powerful use case is combining `TABLE` with `UNION`:

```sql
CREATE TABLE archived_products LIKE products;

-- Union current and archived products
TABLE products
UNION ALL
TABLE archived_products;

-- Mixed with a selective query
SELECT id, name, price FROM products WHERE price > 100
UNION ALL
TABLE archived_products;
```

## Using TABLE in Subqueries

`TABLE` works wherever a subquery is valid:

```sql
-- Use TABLE as a derived table
SELECT p.name, p.price
FROM (TABLE products) AS p
WHERE p.price > 50;

-- Use TABLE in an INSERT ... SELECT
CREATE TABLE products_backup LIKE products;
INSERT INTO products_backup TABLE products;
```

## The VALUES Statement

`VALUES` creates an inline row value constructor - essentially an ad-hoc table built directly from literal values:

```sql
-- Create an inline three-row table with columns named column_0, column_1
VALUES ROW(1, 'alpha'), ROW(2, 'beta'), ROW(3, 'gamma');
```

The columns are automatically named `column_0`, `column_1`, etc.

## Using VALUES in UNION

```sql
-- Combine a real table with hardcoded rows
SELECT id, name FROM products WHERE id < 3
UNION ALL
VALUES ROW(100, 'Special Item'), ROW(101, 'Another Item');
```

## Using VALUES in Joins

```sql
-- Join a table with an inline values list
SELECT p.name, v.discount
FROM products p
JOIN (VALUES ROW(1, 0.10), ROW(2, 0.15), ROW(3, 0.20)) AS v(product_id, discount)
    ON p.id = v.product_id;
```

## Using VALUES for Multi-Row Insert

While `INSERT ... VALUES` already existed, the new `VALUES` statement makes the distinction clearer and enables reuse:

```sql
INSERT INTO products (id, name, price)
VALUES ROW(10, 'Widget', 9.99),
       ROW(11, 'Gadget', 19.99),
       ROW(12, 'Doohickey', 4.99);
```

## Checking Compatibility

```sql
-- Verify MySQL version supports TABLE and VALUES statements
SELECT VERSION();
-- Must be 8.0.19 or later
```

## Summary

The `TABLE` and `VALUES` statements in MySQL 8.0.19+ add SQL-standard shortcuts that reduce boilerplate in common query patterns. `TABLE` provides a clean way to reference an entire table in unions, subqueries, and inserts, while `VALUES` enables inline ad-hoc row sets for joins and unions without needing temporary tables. Both improve query composability and readability.
