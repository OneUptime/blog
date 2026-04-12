# How to Use PERCENT_RANK() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Percent Rank, Window Function, SQL, Analytics

Description: Learn how to use MySQL's PERCENT_RANK() window function to compute a row's relative percentile rank as a value between 0 and 1 within a partition.

---

## Overview

`PERCENT_RANK()` is a MySQL 8.0 window function that computes the relative rank of a row as a fraction between 0 and 1. The formula is `(rank - 1) / (total rows - 1)`. The first row always gets 0.0, the last row always gets 1.0, and ties get the same value. It is ideal for percentile analysis, scoring, and understanding a row's position relative to its peers.

## Basic Syntax

```sql
PERCENT_RANK() OVER (
  [PARTITION BY partition_expression]
  ORDER BY sort_expression [ASC|DESC]
)
```

Returns a `DOUBLE` between 0.0 and 1.0 inclusive.

## Formula

```text
PERCENT_RANK = (RANK() - 1) / (total rows in partition - 1)
```

- First row: 0.0
- Last row: 1.0
- Ties: same fraction (like RANK())

## Basic Examples

```sql
-- Percent rank of employees by salary
SELECT name, salary,
  ROUND(PERCENT_RANK() OVER (ORDER BY salary DESC), 4) AS pct_rank
FROM employees;
-- The top earner gets 0.0, the lowest earner gets 1.0

-- Percent rank within each department
SELECT name, department, salary,
  ROUND(PERCENT_RANK() OVER (PARTITION BY department ORDER BY salary DESC), 4) AS dept_pct_rank
FROM employees;
```

## Comparing PERCENT_RANK() and NTILE()

```sql
SELECT student_id, score,
  PERCENT_RANK() OVER (ORDER BY score DESC) AS pct_rank,  -- continuous 0.0-1.0
  NTILE(4) OVER (ORDER BY score DESC)       AS quartile   -- discrete 1-4
FROM test_scores
WHERE subject = 'Math'
ORDER BY score DESC;
```

- `PERCENT_RANK()` gives a precise relative position
- `NTILE(4)` assigns a discrete bucket number

## Percentile Analysis

```sql
CREATE TABLE test_scores (
  student_id INT,
  subject VARCHAR(50),
  score DECIMAL(5,2)
);

INSERT INTO test_scores VALUES
(1, 'Math', 95), (2, 'Math', 88), (3, 'Math', 72),
(4, 'Math', 85), (5, 'Math', 60), (6, 'Math', 91),
(7, 'Math', 78), (8, 'Math', 55), (9, 'Math', 82), (10, 'Math', 70);

-- What percentile is each student in?
SELECT
  student_id,
  score,
  ROUND(PERCENT_RANK() OVER (ORDER BY score) * 100, 1) AS percentile
FROM test_scores
WHERE subject = 'Math'
ORDER BY score;
-- Student with score=55: percentile ~0 (lowest)
-- Student with score=95: percentile 100 (highest)
```

## Finding Students Above the 75th Percentile

```sql
WITH ranked AS (
  SELECT student_id, score,
    PERCENT_RANK() OVER (ORDER BY score) AS pct_rank
  FROM test_scores
  WHERE subject = 'Math'
)
SELECT student_id, score,
  ROUND(pct_rank * 100, 1) AS percentile
FROM ranked
WHERE pct_rank >= 0.75
ORDER BY score DESC;
```

## Comparing PERCENT_RANK() Across Groups

```sql
-- Salary percentile within the company vs within the department
SELECT name, department, salary,
  ROUND(PERCENT_RANK() OVER (ORDER BY salary) * 100, 1) AS company_percentile,
  ROUND(PERCENT_RANK() OVER (PARTITION BY department ORDER BY salary) * 100, 1) AS dept_percentile
FROM employees
ORDER BY department, salary;
```

## PERCENT_RANK() vs CUME_DIST()

```sql
SELECT student_id, score,
  ROUND(PERCENT_RANK() OVER (ORDER BY score), 4) AS pct_rank,
  ROUND(CUME_DIST() OVER (ORDER BY score), 4)   AS cume_dist
FROM test_scores
WHERE subject = 'Math'
ORDER BY score;
-- PERCENT_RANK: (rank-1)/(N-1), first=0
-- CUME_DIST:    rank/N, first > 0, last = 1
```

## Practical Example: Customer Value Percentile

```sql
-- Rank customers by lifetime value to identify top-tier customers
WITH customer_ranks AS (
  SELECT
    customer_id,
    SUM(amount) AS lifetime_value,
    ROUND(PERCENT_RANK() OVER (ORDER BY SUM(amount)) * 100, 1) AS value_percentile
  FROM orders
  GROUP BY customer_id
)
SELECT customer_id, lifetime_value, value_percentile,
  CASE
    WHEN value_percentile >= 90 THEN 'Platinum'
    WHEN value_percentile >= 75 THEN 'Gold'
    WHEN value_percentile >= 50 THEN 'Silver'
    ELSE 'Bronze'
  END AS tier
FROM customer_ranks
ORDER BY lifetime_value DESC;
```

## Summary

`PERCENT_RANK()` returns a value between 0.0 and 1.0 representing a row's relative position within its partition, calculated as `(rank - 1) / (N - 1)`. The first row is always 0.0 and the last row is always 1.0. Use it for percentile analysis, identifying top performers, and segmenting records by relative rank. For discrete bucket assignments use `NTILE()`; for cumulative distribution use `CUME_DIST()`.
