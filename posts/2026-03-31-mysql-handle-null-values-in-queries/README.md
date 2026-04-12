# How to Handle NULL Values in MySQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NULL Value, Query

Description: Learn how to handle NULL values in MySQL queries using IS NULL, IS NOT NULL, IFNULL, COALESCE, NULLIF, and NULL-safe comparison operators.

---

NULL in MySQL represents an unknown or missing value. It is not the same as zero, an empty string, or false. NULL propagates through expressions - any arithmetic or comparison involving NULL returns NULL unless you use functions specifically designed to handle it.

## Checking for NULL with IS NULL / IS NOT NULL

```sql
-- Find employees without a manager (top-level managers)
SELECT employee_id, name
FROM employees
WHERE manager_id IS NULL;

-- Find orders that have been shipped
SELECT order_id, total
FROM orders
WHERE shipped_date IS NOT NULL;
```

Never use `= NULL` to check for NULL - it always returns NULL (not TRUE or FALSE):

```sql
-- Wrong: never returns rows
SELECT * FROM employees WHERE manager_id = NULL;

-- Correct
SELECT * FROM employees WHERE manager_id IS NULL;
```

## IFNULL: Replace NULL with a Default

```sql
-- Display 0 if no discount is applied
SELECT order_id, total, IFNULL(discount_amount, 0) AS discount
FROM orders;

-- Display 'No Manager' for top-level employees
SELECT name, IFNULL(manager_name, 'No Manager') AS reports_to
FROM employees;
```

`IFNULL(expr, fallback)` returns `expr` if it is not NULL, otherwise returns `fallback`.

## COALESCE: First Non-NULL from Multiple Options

```sql
-- Use first available contact method
SELECT
  customer_id,
  COALESCE(mobile_phone, home_phone, work_phone, 'No Phone') AS best_contact
FROM customers;
```

`COALESCE` accepts any number of arguments and returns the first non-NULL one. It is the more flexible alternative to `IFNULL`.

## NULLIF: Return NULL When Values Match

```sql
-- Avoid division by zero by returning NULL when denominator is 0
SELECT
  order_id,
  total / NULLIF(quantity, 0) AS price_per_unit
FROM order_items;
```

`NULLIF(a, b)` returns NULL if `a = b`, otherwise returns `a`. This is useful to avoid division-by-zero errors.

## NULL in Arithmetic

```sql
-- Any arithmetic with NULL returns NULL
SELECT 100 + NULL;   -- Returns NULL
SELECT NULL * 5;     -- Returns NULL

-- Use IFNULL to treat NULL as 0
SELECT 100 + IFNULL(discount, 0) AS adjusted_price FROM orders;
```

## NULL in Aggregate Functions

Most aggregate functions skip NULL values:

```sql
-- COUNT(*) counts all rows, COUNT(col) skips NULLs
SELECT
  COUNT(*) AS total_rows,
  COUNT(discount_amount) AS rows_with_discount,
  AVG(discount_amount) AS avg_discount,   -- NULLs excluded from avg
  SUM(discount_amount) AS total_discounts -- NULLs excluded from sum
FROM orders;
```

## NULL in Sorting

```sql
-- NULLs sort first in ASC, last in DESC
SELECT task_id, due_date FROM tasks ORDER BY due_date ASC;

-- Force NULLs to appear last in ASC sort
SELECT task_id, due_date FROM tasks
ORDER BY (due_date IS NULL) ASC, due_date ASC;
```

## NULL-Safe Comparison with <=>

```sql
-- Standard = returns NULL when comparing with NULL
SELECT 1 WHERE NULL = NULL;     -- No rows

-- NULL-safe <=> returns TRUE when both sides are NULL
SELECT 1 WHERE NULL <=> NULL;   -- Returns 1
```

## NULL in NOT IN

```sql
-- If the subquery returns any NULL, NOT IN returns no rows
SELECT * FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM blacklist);
-- If blacklist has a NULL customer_id, this returns nothing!

-- Use NOT EXISTS to be safe
SELECT * FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM blacklist b WHERE b.customer_id = c.customer_id
);
```

## Summary

NULL represents unknown values and propagates through arithmetic and comparisons. Use `IS NULL` and `IS NOT NULL` for NULL checks - never `= NULL`. Replace NULLs with defaults using `IFNULL` (two args) or `COALESCE` (multiple args). Use `NULLIF` to convert specific values to NULL, such as zero denominators. Be cautious with `NOT IN` when subqueries may return NULLs - prefer `NOT EXISTS`. Aggregate functions ignore NULLs, but `COUNT(*)` counts all rows regardless.
