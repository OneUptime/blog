# How to Use CUME_DIST() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Analytics, SQL

Description: Learn how to use the CUME_DIST() window function in MySQL to calculate the cumulative distribution of a value within a result set partition.

---

## What Is CUME_DIST()?

`CUME_DIST()` is a window function that calculates the cumulative distribution of a value within an ordered partition. It returns the proportion of rows with values less than or equal to the current row's value. The result is a number between 0 and 1 (exclusive of 0, inclusive of 1).

The formula is:

```text
CUME_DIST() = (number of rows with value <= current row's value) / (total rows in partition)
```

## Basic Syntax

```sql
CUME_DIST() OVER (
    [PARTITION BY column1, column2, ...]
    ORDER BY column [ASC|DESC]
)
```

- `PARTITION BY` divides rows into groups before computing the distribution.
- `ORDER BY` defines the sort order used to calculate the cumulative distribution.

## Simple Example

Given a `sales` table with employee sales data:

```sql
CREATE TABLE sales (
    employee_name VARCHAR(50),
    department    VARCHAR(50),
    sales_amount  DECIMAL(10,2)
);

INSERT INTO sales VALUES
  ('Alice', 'East', 5000),
  ('Bob',   'East', 3000),
  ('Carol', 'East', 7000),
  ('Dave',  'East', 3000),
  ('Eve',   'West', 4000),
  ('Frank', 'West', 6000),
  ('Grace', 'West', 6000);
```

Compute the cumulative distribution across all employees ordered by `sales_amount`:

```sql
SELECT
    employee_name,
    sales_amount,
    CUME_DIST() OVER (ORDER BY sales_amount) AS cume_dist
FROM sales;
```

Sample output:

```text
employee_name | sales_amount | cume_dist
--------------+--------------+----------
Bob           |      3000.00 | 0.2857
Dave          |      3000.00 | 0.2857
Eve           |      4000.00 | 0.4286
Alice         |      5000.00 | 0.5714
Frank         |      6000.00 | 0.8571
Grace         |      6000.00 | 0.8571
Carol         |      7000.00 | 1.0000
```

Tied values share the same `CUME_DIST` value because all tied rows are treated as having the same rank.

## Using PARTITION BY

Partition by department to get the cumulative distribution within each group:

```sql
SELECT
    employee_name,
    department,
    sales_amount,
    CUME_DIST() OVER (
        PARTITION BY department
        ORDER BY sales_amount
    ) AS dept_cume_dist
FROM sales
ORDER BY department, sales_amount;
```

This resets the distribution calculation for each department independently.

## Identifying Top Percentiles

A common use case is finding records in the top N percent. To retrieve employees in the top 40% of their department:

```sql
SELECT employee_name, department, sales_amount, dept_cume_dist
FROM (
    SELECT
        employee_name,
        department,
        sales_amount,
        CUME_DIST() OVER (
            PARTITION BY department
            ORDER BY sales_amount DESC
        ) AS dept_cume_dist
    FROM sales
) ranked
WHERE dept_cume_dist <= 0.40;
```

By ordering `DESC`, the highest values get the smallest `CUME_DIST`, making it easy to filter for top performers.

## CUME_DIST vs PERCENT_RANK

Both return values in [0, 1], but they differ:

| Function       | Formula                                           | Minimum value |
|----------------|---------------------------------------------------|---------------|
| `PERCENT_RANK` | (rank - 1) / (total rows - 1)                    | 0             |
| `CUME_DIST`    | rows with value <= current / total rows           | > 0           |

```sql
SELECT
    employee_name,
    sales_amount,
    PERCENT_RANK() OVER (ORDER BY sales_amount) AS pct_rank,
    CUME_DIST()    OVER (ORDER BY sales_amount) AS cume_dist
FROM sales
ORDER BY sales_amount;
```

`CUME_DIST` always includes the current row in the count, so it never returns 0.

## Practical Use Case - Scoring Model

Assign a letter grade based on cumulative distribution percentile:

```sql
SELECT
    employee_name,
    sales_amount,
    CUME_DIST() OVER (ORDER BY sales_amount) AS cume_dist,
    CASE
        WHEN CUME_DIST() OVER (ORDER BY sales_amount) >= 0.80 THEN 'A'
        WHEN CUME_DIST() OVER (ORDER BY sales_amount) >= 0.60 THEN 'B'
        WHEN CUME_DIST() OVER (ORDER BY sales_amount) >= 0.40 THEN 'C'
        ELSE 'D'
    END AS grade
FROM sales
ORDER BY sales_amount;
```

## Summary

`CUME_DIST()` computes the fraction of rows at or below each row's value within an ordered partition, returning values between just above 0 and 1. It is useful for percentile analysis, identifying top or bottom performers, and building scoring models. Combine it with `PARTITION BY` to scope the calculation to logical groups and use a subquery to filter by percentile thresholds.
