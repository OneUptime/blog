# How to Use COUNT(*) vs COUNT(column) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Aggregate Function, Query

Description: Learn the difference between COUNT(*) and COUNT(column) in MySQL, how NULL handling affects results, and when to use each form.

---

## The Core Difference

Both `COUNT(*)` and `COUNT(column)` count rows, but they behave differently with `NULL` values:

- `COUNT(*)` counts all rows in the result set, including rows where all columns are `NULL`
- `COUNT(column)` counts only rows where the specified column is NOT `NULL`

This distinction is fundamental and a frequent source of bugs in aggregation queries.

## Example Setup

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  discount_code VARCHAR(20),  -- nullable
  total DECIMAL(10,2)
);

INSERT INTO orders (customer_id, discount_code, total) VALUES
  (1, 'SAVE10', 100.00),
  (2, NULL, 50.00),
  (3, 'SAVE20', 200.00),
  (4, NULL, 75.00),
  (5, NULL, 125.00);
```

## COUNT(*) vs COUNT(column) in Action

```sql
SELECT
  COUNT(*) AS total_orders,
  COUNT(discount_code) AS orders_with_discount,
  COUNT(customer_id) AS orders_with_customer
FROM orders;
```

Result:

```text
+--------------+----------------------+----------------------+
| total_orders | orders_with_discount | orders_with_customer |
+--------------+----------------------+----------------------+
|            5 |                    2 |                    5 |
+--------------+----------------------+----------------------+
```

`COUNT(*)` = 5 (all rows)
`COUNT(discount_code)` = 2 (only non-NULL discount codes)
`COUNT(customer_id)` = 5 (no NULLs in that column)

## Using COUNT() with GROUP BY

```sql
SELECT
  customer_id,
  COUNT(*) AS total_orders,
  COUNT(discount_code) AS discounted_orders
FROM orders
GROUP BY customer_id;
```

## COUNT(DISTINCT column)

To count unique non-NULL values:

```sql
SELECT COUNT(DISTINCT customer_id) AS unique_customers
FROM orders;
```

This is distinct from both `COUNT(*)` and `COUNT(column)` - it counts unique non-NULL values only.

## Performance Implications

`COUNT(*)` is optimized by MySQL and InnoDB:

```sql
-- Fast: InnoDB can count rows without reading column data
SELECT COUNT(*) FROM orders;

-- Slightly slower: must read column to check for NULL
SELECT COUNT(discount_code) FROM orders;
```

For InnoDB tables, `COUNT(*)` is internally equivalent to `COUNT(1)` and is highly optimized. Do not use `COUNT(1)` over `COUNT(*)` expecting a speedup - they perform identically.

## Common Mistakes

**Mistake 1: Assuming COUNT(col) equals COUNT(*)**

```sql
-- Wrong assumption: these may return different values
SELECT COUNT(*)           FROM orders;  -- 5
SELECT COUNT(discount_code) FROM orders;  -- 2
```

**Mistake 2: Using COUNT(*) in OUTER JOIN to count matched rows**

```sql
-- Correct pattern: use COUNT(column) from the joined table
SELECT
  c.id,
  c.name,
  COUNT(o.id) AS order_count  -- 0 for customers with no orders (o.id is NULL)
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name;
```

Here `COUNT(o.id)` correctly returns 0 for customers with no orders because `o.id` is `NULL` for unmatched rows.

## Conditional Counting

Count rows matching a condition without a subquery:

```sql
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN total > 100 THEN 1 END) AS high_value_orders,
  SUM(total > 100) AS high_value_orders_alt  -- Boolean trick (MySQL specific)
FROM orders;
```

## Summary

Use `COUNT(*)` when you want to count all rows. Use `COUNT(column)` when you want to count non-NULL values in a specific column - this is especially useful in `LEFT JOIN` results and conditional aggregations. Understanding NULL handling in `COUNT()` prevents subtle bugs in reporting queries.
