# How to Use TABLE Statement in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Statement, Table, Query, DDL

Description: Learn how to use the TABLE statement introduced in MySQL 8.0.19 as a shorthand for SELECT * FROM, supporting UNION, ORDER BY, and LIMIT.

---

## Overview

MySQL 8.0.19 introduced the `TABLE` statement as a simple shorthand for `SELECT * FROM table_name`. It returns all rows and columns from a table without requiring the full `SELECT` syntax. The `TABLE` statement supports `ORDER BY` and `LIMIT` clauses, and can be used in `UNION`, `INTERSECT`, and `EXCEPT` operations.

## Basic Syntax

```sql
TABLE table_name [ORDER BY column_name] [LIMIT row_count [OFFSET offset]];
```

## Basic Usage

```sql
TABLE users;
-- Equivalent to: SELECT * FROM users;
```

This returns all rows and all columns from the `users` table, just like `SELECT *`.

## With ORDER BY

```sql
TABLE users ORDER BY name;
-- Equivalent to: SELECT * FROM users ORDER BY name;
```

## With LIMIT and OFFSET

```sql
TABLE products LIMIT 10;
-- First 10 rows

TABLE products LIMIT 10 OFFSET 20;
-- Rows 21-30
```

## Using TABLE in UNION

The `TABLE` statement can be combined with `SELECT` in a `UNION`:

```sql
SELECT id, name FROM admins
UNION
TABLE users;
```

Both the `SELECT` and the `TABLE` must have compatible column counts and types.

## TABLE vs SELECT *

The key difference is that `TABLE` does not support:
- Column filtering (no `SELECT col1, col2` style)
- `WHERE` clauses
- `GROUP BY` or `HAVING`
- `JOIN` operations

`TABLE` is purely for returning all rows and all columns from a single table, optionally ordered and limited.

```sql
-- These are equivalent:
TABLE employees;
SELECT * FROM employees;

-- TABLE cannot do this:
SELECT name, salary FROM employees WHERE active = 1;
```

## Using TABLE as a Subquery

`TABLE` can be used as a derived table in the `FROM` clause:

```sql
SELECT t.id, t.name
FROM (TABLE employees) AS t
WHERE t.department = 'engineering';
```

## Using TABLE in INSERT

You can use `TABLE` as the source for an `INSERT ... TABLE` statement:

```sql
INSERT INTO employees_backup TABLE employees;
-- Equivalent to: INSERT INTO employees_backup SELECT * FROM employees;
```

## Using TABLE in CREATE TABLE ... SELECT

```sql
CREATE TABLE employees_snapshot SELECT * FROM employees;
-- Can also be written as:
CREATE TABLE employees_snapshot TABLE employees;
```

## Practical Example

Combine `TABLE` with `UNION ALL` to merge data from archive and current tables:

```sql
TABLE current_orders
UNION ALL
TABLE archived_orders
ORDER BY order_date
LIMIT 100;
```

Note: when column names differ or aliases are needed, use `SELECT` instead.

## Summary

The `TABLE` statement is a concise MySQL 8.0.19+ shorthand for `SELECT * FROM table_name`. It supports `ORDER BY`, `LIMIT`, `UNION`, and can be used as a subquery or `INSERT` source. While it does not replace `SELECT` for filtering or joining data, it is a clean option when you genuinely need all rows and columns from a single table in scripts, quick inspections, and union queries.
