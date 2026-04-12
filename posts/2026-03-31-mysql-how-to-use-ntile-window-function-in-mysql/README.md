# How to Use NTILE() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NTILE, Window Function, SQL, Analytics

Description: Learn how to use MySQL's NTILE() window function to distribute rows into a specified number of buckets for percentile analysis and data segmentation.

---

## Overview

`NTILE(n)` is a MySQL 8.0 window function that divides the rows within a partition into `n` roughly equal buckets and assigns each row a bucket number from 1 to `n`. It is ideal for dividing data into quartiles, deciles, quintiles, or any equal-sized segments for analysis.

## Basic Syntax

```sql
NTILE(n) OVER (
  [PARTITION BY partition_expression]
  ORDER BY sort_expression [ASC|DESC]
)
```

`n` must be a positive integer literal or expression. Rows are distributed as evenly as possible; if the total row count is not divisible by `n`, earlier buckets receive one extra row.

## Basic Examples

```sql
-- Divide rows into 4 quartiles by salary
SELECT name, salary,
  NTILE(4) OVER (ORDER BY salary DESC) AS quartile
FROM employees;

-- Divide into deciles (10 equal buckets)
SELECT name, score,
  NTILE(10) OVER (ORDER BY score DESC) AS decile
FROM test_scores;

-- Divide within each department into tertiles (3 buckets)
SELECT name, department, salary,
  NTILE(3) OVER (PARTITION BY department ORDER BY salary DESC) AS tertile
FROM employees;
```

## Understanding Bucket Distribution

```sql
-- 7 rows into 3 buckets: bucket 1 gets 3 rows, buckets 2 and 3 get 2 rows
SELECT val,
  NTILE(3) OVER (ORDER BY val) AS bucket
FROM (
  SELECT 1 AS val UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
) t;
-- Bucket 1: 1, 2, 3
-- Bucket 2: 4, 5
-- Bucket 3: 6, 7
```

## Quartile Analysis

```sql
CREATE TABLE salaries (
  employee_id INT,
  name VARCHAR(100),
  department VARCHAR(50),
  salary DECIMAL(10,2)
);

INSERT INTO salaries VALUES
(1, 'Alice', 'Engineering', 120000),
(2, 'Bob',   'Engineering', 95000),
(3, 'Carol', 'Engineering', 80000),
(4, 'Dave',  'Marketing',   70000),
(5, 'Eve',   'Marketing',   65000),
(6, 'Frank', 'Engineering', 110000),
(7, 'Grace', 'Marketing',   90000),
(8, 'Hank',  'Engineering', 75000);

-- Assign salary quartiles across the company
SELECT name, department, salary,
  NTILE(4) OVER (ORDER BY salary DESC) AS quartile,
  CASE NTILE(4) OVER (ORDER BY salary DESC)
    WHEN 1 THEN 'Top 25%'
    WHEN 2 THEN 'Upper Middle'
    WHEN 3 THEN 'Lower Middle'
    WHEN 4 THEN 'Bottom 25%'
  END AS salary_band
FROM salaries
ORDER BY salary DESC;
```

## Percentile-Based Sampling

```sql
-- Select only the top 10% of customers by lifetime value
WITH deciles AS (
  SELECT customer_id, lifetime_value,
    NTILE(10) OVER (ORDER BY lifetime_value DESC) AS decile
  FROM customers
)
SELECT customer_id, lifetime_value
FROM deciles
WHERE decile = 1;
```

## A/B Testing with NTILE()

```sql
-- Split users into 5 equal groups for an A/B test
SELECT user_id,
  NTILE(5) OVER (ORDER BY user_id) AS test_group
FROM users
WHERE created_at >= '2024-01-01';
```

## Computing Bucket Boundaries

```sql
-- Find the min and max salary in each quartile
WITH quartiles AS (
  SELECT name, salary,
    NTILE(4) OVER (ORDER BY salary) AS q
  FROM salaries
)
SELECT q AS quartile,
  MIN(salary) AS q_min,
  MAX(salary) AS q_max,
  COUNT(*) AS row_count
FROM quartiles
GROUP BY q
ORDER BY q;
```

## NTILE() vs PERCENT_RANK()

```sql
SELECT name, score,
  NTILE(4) OVER (ORDER BY score DESC) AS quartile_bucket,
  ROUND(PERCENT_RANK() OVER (ORDER BY score DESC), 4) AS pct_rank
FROM test_scores;
-- NTILE: assigns integer bucket labels (1, 2, 3, 4)
-- PERCENT_RANK: continuous value from 0.0 to 1.0
```

## Summary

`NTILE(n)` divides rows into `n` equal-sized buckets and assigns each row a bucket number from 1 to `n`. Use it for quartile/decile analysis, equal-size sampling, A/B test group assignment, and salary band classification. When row count is not divisible by `n`, earlier buckets receive one extra row. For continuous percentile values use `PERCENT_RANK()` instead.
