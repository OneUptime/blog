# How to Use ROW_NUMBER() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Row Number, Window Function, SQL, Analytics

Description: Learn how to use MySQL's ROW_NUMBER() window function to assign sequential integers to rows within a result set partition for pagination and deduplication.

---

## Overview

`ROW_NUMBER()` is a window function introduced in MySQL 8.0 that assigns a unique sequential integer to each row within its partition, starting from 1. Unlike `RANK()`, it never produces ties - every row gets a distinct number. It is one of the most widely used window functions for pagination, deduplication, and top-N queries.

## Basic Syntax

```sql
ROW_NUMBER() OVER (
  [PARTITION BY partition_expression]
  ORDER BY sort_expression [ASC|DESC]
)
```

## Basic Examples

```sql
-- Number rows across the entire result set
SELECT
  id, name, salary,
  ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num
FROM employees;

-- Number rows within each department
SELECT
  id, name, department, salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;
```

## Deduplication: Keeping the Latest Record per Group

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  amount DECIMAL(10,2),
  created_at DATETIME
);

INSERT INTO orders (customer_id, amount, created_at) VALUES
(1, 100, '2024-06-01 10:00:00'),
(1, 200, '2024-06-05 12:00:00'),  -- latest for customer 1
(2, 150, '2024-06-02 09:00:00'),
(2, 300, '2024-06-07 14:00:00');  -- latest for customer 2

-- Keep only the most recent order per customer
SELECT customer_id, id, amount, created_at
FROM (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
  FROM orders
) ranked
WHERE rn = 1;
```

## Pagination with ROW_NUMBER()

```sql
-- Get page 2 (rows 11-20) of a products table sorted by name
SELECT *
FROM (
  SELECT *,
    ROW_NUMBER() OVER (ORDER BY name) AS rn
  FROM products
) paged
WHERE rn BETWEEN 11 AND 20;
```

Note: In MySQL 8.0+, `LIMIT` with `OFFSET` is simpler for basic pagination; `ROW_NUMBER()` is more useful for pagination with complex filtering.

## Top-N per Group

```sql
-- Top 3 highest-paid employees per department
SELECT department, name, salary
FROM (
  SELECT department, name, salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
) ranked
WHERE rn <= 3;
```

## Assigning Sequential IDs

```sql
-- Add a sequential number to rows in a derived table
SELECT
  ROW_NUMBER() OVER (ORDER BY sale_date) AS seq,
  sale_date,
  amount
FROM daily_sales
WHERE sale_date >= '2024-01-01';
```

## ROW_NUMBER() vs RANK() vs DENSE_RANK()

```sql
SELECT name, score,
  ROW_NUMBER()  OVER (ORDER BY score DESC) AS row_num,   -- no ties: 1,2,3,4
  RANK()        OVER (ORDER BY score DESC) AS rnk,       -- gaps on tie: 1,2,2,4
  DENSE_RANK()  OVER (ORDER BY score DESC) AS dense_rnk  -- no gaps: 1,2,2,3
FROM leaderboard;
```

## Practical Example: Identifying Duplicate Rows

```sql
-- Find duplicate emails - keep the earliest, flag others as duplicates
SELECT id, email, created_at
FROM (
  SELECT id, email, created_at,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
) ranked
WHERE rn > 1;  -- these are duplicates
```

## Summary

`ROW_NUMBER()` assigns a unique sequential integer to each row within its partition, ordered by the specified column. It is the go-to function for deduplication (keep the first/last per group), top-N filtering, and offset-based pagination. Unlike `RANK()` and `DENSE_RANK()`, `ROW_NUMBER()` never produces ties and always increments by 1, making it safe to use in equality filters like `WHERE rn = 1`.
