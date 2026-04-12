# How to Use HAVING Clause in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DML, HAVING, GROUP BY, Aggregation

Description: Filter aggregated results in MySQL using the HAVING clause, understand the difference between WHERE and HAVING, and write efficient group-level filters.

---

## How It Works

`HAVING` filters groups after `GROUP BY` aggregation is complete. It operates on the results of aggregate functions, which `WHERE` cannot do because `WHERE` is evaluated before aggregation.

```mermaid
flowchart LR
    A[FROM / JOIN] --> B[WHERE\nfilter rows pre-aggregation]
    B --> C[GROUP BY\ncollapse to groups]
    C --> D[HAVING\nfilter groups post-aggregation]
    D --> E[SELECT\ncompute output columns]
    E --> F[ORDER BY / LIMIT]
```

## WHERE vs HAVING

| Clause | Applied | Can reference aggregate functions | Can reference non-aggregated columns |
|---|---|---|---|
| `WHERE` | Before GROUP BY | No | Yes |
| `HAVING` | After GROUP BY | Yes | Yes (if in GROUP BY) |

## Syntax

```sql
SELECT col, aggregate_function(col) AS alias
FROM table
[WHERE condition]
GROUP BY col
HAVING aggregate_condition
[ORDER BY col];
```

## Sample Data

```sql
CREATE TABLE orders (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED    NOT NULL,
    category   VARCHAR(50)     NOT NULL,
    amount     DECIMAL(10, 2)  NOT NULL,
    status     VARCHAR(20)     NOT NULL DEFAULT 'completed',
    created_at DATE            NOT NULL
);

INSERT INTO orders (user_id, category, amount, status, created_at) VALUES
    (1, 'Electronics', 299.99, 'completed', '2024-01-15'),
    (1, 'Books',        39.99, 'completed', '2024-01-20'),
    (2, 'Electronics', 149.99, 'completed', '2024-01-22'),
    (2, 'Clothing',     59.99, 'completed', '2024-02-01'),
    (3, 'Books',        24.99, 'completed', '2024-02-05'),
    (3, 'Electronics', 499.99, 'completed', '2024-02-10'),
    (1, 'Electronics', 199.99, 'cancelled', '2024-02-15'),
    (4, 'Clothing',     89.99, 'completed', '2024-03-01'),
    (4, 'Books',        49.99, 'completed', '2024-03-05'),
    (5, 'Electronics', 399.99, 'completed', '2024-03-10'),
    (6, 'Books',        12.99, 'completed', '2024-03-12'),
    (7, 'Electronics',  89.99, 'completed', '2024-03-15');
```

## Basic HAVING Example

Find categories with more than 2 orders.

```sql
SELECT category, COUNT(*) AS order_count
FROM orders
GROUP BY category
HAVING order_count > 2
ORDER BY order_count DESC;
```

```text
+-------------+-------------+
| category    | order_count |
+-------------+-------------+
| Electronics |           6 |
| Books       |           4 |
+-------------+-------------+
```

`Clothing` (2 orders) is excluded because `2 > 2` is FALSE.

## HAVING with SUM

Find categories where total revenue exceeds 500.

```sql
SELECT category, SUM(amount) AS total_revenue
FROM orders
WHERE status = 'completed'
GROUP BY category
HAVING total_revenue > 500
ORDER BY total_revenue DESC;
```

```text
+-------------+---------------+
| category    | total_revenue |
+-------------+---------------+
| Electronics |       1439.95 |
+-------------+---------------+
```

## HAVING with AVG

Find categories where the average order value is above 50.

```sql
SELECT
    category,
    COUNT(*)         AS order_count,
    ROUND(AVG(amount), 2) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY category
HAVING AVG(amount) > 50
ORDER BY avg_order_value DESC;
```

```text
+-------------+-------------+-----------------+
| category    | order_count | avg_order_value |
+-------------+-------------+-----------------+
| Electronics |           5 |          287.99 |
| Clothing    |           2 |           74.99 |
+-------------+-------------+-----------------+
```

## Combining WHERE and HAVING

`WHERE` filters rows before aggregation; `HAVING` filters groups after.

```sql
-- Only count completed orders (WHERE), then filter for active categories (HAVING)
SELECT
    category,
    COUNT(*) AS completed_count,
    SUM(amount) AS revenue
FROM orders
WHERE status = 'completed'          -- pre-filter: exclude cancelled orders
GROUP BY category
HAVING completed_count >= 3         -- post-filter: only categories with 3+ orders
ORDER BY revenue DESC;
```

```text
+-------------+-----------------+----------+
| category    | completed_count | revenue  |
+-------------+-----------------+----------+
| Electronics |               5 | 1439.95  |
| Books       |               4 |  127.96  |
+-------------+-----------------+----------+
```

## HAVING with COUNT DISTINCT

Find users who have ordered from at least 2 different categories.

```sql
SELECT
    user_id,
    COUNT(DISTINCT category) AS category_count
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING category_count >= 2
ORDER BY category_count DESC, user_id;
```

```text
+---------+----------------+
| user_id | category_count |
+---------+----------------+
|       1 |              2 |
|       2 |              2 |
|       3 |              2 |
|       4 |              2 |
+---------+----------------+
```

## HAVING with Multiple Conditions

```sql
SELECT
    category,
    COUNT(*)       AS order_count,
    SUM(amount)    AS total,
    AVG(amount)    AS avg_order
FROM orders
WHERE status = 'completed'
GROUP BY category
HAVING order_count >= 2
   AND avg_order > 30
ORDER BY total DESC;
```

## Using the Aggregate Function Directly in HAVING

You do not need to alias the aggregate in `SELECT` to use it in `HAVING`. You can repeat the expression.

```sql
SELECT category, COUNT(*) AS cnt
FROM orders
GROUP BY category
HAVING COUNT(*) > 3;
-- Same as: HAVING cnt > 3 (alias form also works in MySQL)
```

## HAVING Without GROUP BY

MySQL allows `HAVING` without `GROUP BY`. The entire table is treated as a single group.

```sql
-- True if the table has more than 10 rows
SELECT COUNT(*) AS total_orders
FROM orders
HAVING COUNT(*) > 10;
```

```text
+--------------+
| total_orders |
+--------------+
|           12 |
+--------------+
```

## Monthly Revenue - Filter Months Above Threshold

```sql
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    SUM(amount)                       AS monthly_revenue
FROM orders
WHERE status = 'completed'
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
HAVING monthly_revenue > 400
ORDER BY month;
```

```text
+---------+-----------------+
| month   | monthly_revenue |
+---------+-----------------+
| 2024-01 |          489.97 |
| 2024-02 |          584.97 |
| 2024-03 |          642.95 |
+---------+-----------------+
```

## Best Practices

- Put conditions on non-aggregated columns in `WHERE` (pre-aggregation), not in `HAVING`. This reduces the number of rows before grouping and is faster.
- Use `HAVING` only for conditions that involve aggregate function results.
- Add indexes on both `WHERE` filter columns and `GROUP BY` columns for efficient queries.
- Avoid placing expressions on grouped columns in `HAVING` that could instead go in `WHERE`.

Wrong approach (slow):

```sql
HAVING category = 'Electronics'  -- should be WHERE
```

Correct approach (fast):

```sql
WHERE category = 'Electronics'   -- pre-filter before grouping
```

## Summary

`HAVING` filters groups produced by `GROUP BY` based on aggregate function results. It is evaluated after `WHERE` (which filters individual rows) and after `GROUP BY` (which collapses rows into groups). Use `HAVING` for conditions involving `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, and other aggregate functions. Pre-filter as much as possible with `WHERE` before grouping, and use `HAVING` only for group-level conditions that require aggregation.
