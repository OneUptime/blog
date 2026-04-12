# How to Calculate Modes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Statistics

Description: Learn how to calculate the mode (most frequently occurring value) in MySQL using GROUP BY, RANK(), and window functions for single and grouped datasets.

---

The mode is the value that appears most frequently in a dataset. MySQL has no built-in `MODE()` aggregate function, so you need to count occurrences and select the most common value manually. There can also be multiple modes (ties), which adds complexity.

## Basic Mode Calculation

The simplest approach counts occurrences and returns the top result:

```sql
SELECT score AS mode_score, COUNT(*) AS frequency
FROM exam_results
GROUP BY score
ORDER BY frequency DESC
LIMIT 1;
```

This returns a single mode. If there are ties, only one is returned arbitrarily.

## Returning All Modes (Handling Ties)

To return all values that tie for the highest frequency, use a subquery to find the maximum count:

```sql
SELECT score AS mode_score, COUNT(*) AS frequency
FROM exam_results
GROUP BY score
HAVING COUNT(*) = (
  SELECT MAX(cnt)
  FROM (
    SELECT COUNT(*) AS cnt
    FROM exam_results
    GROUP BY score
  ) AS counts
);
```

This returns every value that occurs with the maximum frequency.

## Using Window Functions (MySQL 8.0+)

The `RANK()` window function provides a cleaner way to find all modes:

```sql
WITH freq AS (
  SELECT score, COUNT(*) AS cnt
  FROM exam_results
  GROUP BY score
),
ranked AS (
  SELECT score, cnt, RANK() OVER (ORDER BY cnt DESC) AS rnk
  FROM freq
)
SELECT score AS mode_score, cnt AS frequency
FROM ranked
WHERE rnk = 1;
```

`RANK()` assigns rank 1 to all tied top values, so this naturally handles multimodal datasets.

## Grouped Mode Per Category

To compute the mode of a value within each group, partition the window function:

```sql
WITH freq AS (
  SELECT department, salary, COUNT(*) AS cnt
  FROM employees
  GROUP BY department, salary
),
ranked AS (
  SELECT
    department,
    salary,
    cnt,
    RANK() OVER (PARTITION BY department ORDER BY cnt DESC) AS rnk
  FROM freq
)
SELECT department, salary AS mode_salary, cnt AS frequency
FROM ranked
WHERE rnk = 1;
```

This returns the most common salary within each department, including ties.

## Mode for String Columns

The same technique works for text columns:

```sql
WITH freq AS (
  SELECT product_category, COUNT(*) AS cnt
  FROM orders
  GROUP BY product_category
)
SELECT product_category AS mode_category, cnt
FROM freq
WHERE cnt = (SELECT MAX(cnt) FROM freq);
```

## Combining Mode and Other Statistics

You can compute mode alongside average in a single report by using CTEs:

```sql
WITH stats AS (
  SELECT
    department,
    AVG(salary) AS avg_salary,
    COUNT(*) AS headcount
  FROM employees
  GROUP BY department
),
mode_calc AS (
  SELECT department, salary AS mode_salary
  FROM (
    SELECT department, salary, RANK() OVER (PARTITION BY department ORDER BY COUNT(*) DESC) AS rnk
    FROM employees
    GROUP BY department, salary
  ) r
  WHERE rnk = 1
)
SELECT s.department, s.avg_salary, m.mode_salary, s.headcount
FROM stats s
JOIN mode_calc m ON s.department = m.department;
```

## Summary

MySQL does not include a native mode function, but counting frequencies and filtering for the maximum count achieves the same result. MySQL 8.0 window functions simplify the query further with `RANK()`, which naturally handles ties. For grouped modes, add `PARTITION BY` to compute modes independently per group.
