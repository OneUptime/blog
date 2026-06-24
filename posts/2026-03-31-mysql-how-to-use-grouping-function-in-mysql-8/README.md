# How to Use GROUPING() Function in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Grouping, ROLLUP, CUBE, Aggregation, Analytics

Description: Learn how to use the GROUPING() function in MySQL 8 to distinguish super-aggregate rows from NULL values in ROLLUP and CUBE queries.

---

## What Is the GROUPING() Function

When using `GROUP BY ... WITH ROLLUP`, MySQL adds extra rows representing subtotals and grand totals. These extra rows have `NULL` in the grouping columns, which is ambiguous - it could mean "all groups" or it could be actual `NULL` data.

The `GROUPING()` function, introduced in MySQL 8.0.1, returns `1` when the `NULL` in a column comes from a ROLLUP super-aggregate row, and `0` when it comes from an actual `NULL` value in the data.

## Basic ROLLUP Without GROUPING()

```sql
SELECT department, job_title, SUM(salary) AS total_salary
FROM employees
GROUP BY department, job_title WITH ROLLUP;
```

Sample output:

```text
+-------------+-----------+--------------+
| department  | job_title | total_salary |
+-------------+-----------+--------------+
| Engineering | Engineer  |       250000 |
| Engineering | Manager   |        90000 |
| Engineering | NULL      |       340000 |  <- subtotal for Engineering
| Sales       | Manager   |        85000 |
| Sales       | Rep       |       120000 |
| Sales       | NULL      |       205000 |  <- subtotal for Sales
| NULL        | NULL      |       545000 |  <- grand total
+-------------+-----------+--------------+
```

The `NULL` rows are ambiguous if your data could contain `NULL` departments.

## Using GROUPING() to Label Super-Aggregate Rows

```sql
SELECT
  IF(GROUPING(department), 'ALL DEPARTMENTS', department) AS department,
  IF(GROUPING(job_title), 'ALL TITLES', job_title) AS job_title,
  SUM(salary) AS total_salary
FROM employees
GROUP BY department, job_title WITH ROLLUP;
```

Output:

```text
+-----------------+------------+--------------+
| department      | job_title  | total_salary |
+-----------------+------------+--------------+
| Engineering     | Engineer   |       250000 |
| Engineering     | Manager    |        90000 |
| Engineering     | ALL TITLES |       340000 |
| Sales           | Manager    |        85000 |
| Sales           | Rep        |       120000 |
| Sales           | ALL TITLES |       205000 |
| ALL DEPARTMENTS | ALL TITLES |       545000 |
+-----------------+------------+--------------+
```

## Filtering Super-Aggregate Rows

Use `GROUPING()` in a `HAVING` clause to return only the rollup rows:

```sql
SELECT
  IF(GROUPING(department), 'TOTAL', department) AS department,
  SUM(salary) AS total_salary
FROM employees
GROUP BY department WITH ROLLUP
HAVING GROUPING(department) = 1;
```

This returns only the grand total row.

## Filtering Non-Aggregate Rows

To exclude rollup rows and return only regular grouped data:

```sql
SELECT department, SUM(salary) AS total_salary
FROM employees
GROUP BY department WITH ROLLUP
HAVING GROUPING(department) = 0;
```

## Multi-Column GROUPING() Bitmask

`GROUPING()` can accept multiple columns and returns a bitmask:

```sql
SELECT
  department,
  job_title,
  GROUPING(department, job_title) AS grp_mask,
  SUM(salary) AS total_salary
FROM employees
GROUP BY department, job_title WITH ROLLUP;
```

With ROLLUP, the possible bitmask values for this query are:
- `0` - regular row
- `1` - job_title is a rollup NULL (subtotal row)
- `3` - both are rollup NULLs (grand total)

Note: Value `2` (department rolled up but not job_title) cannot occur with ROLLUP because it rolls up right-to-left. The leftmost column is only rolled up when all columns to its right are already rolled up.

## Practical Example - Sales Report with Subtotals

```sql
SELECT
  IF(GROUPING(region), 'ALL REGIONS', region) AS region,
  IF(GROUPING(product_category), 'ALL CATEGORIES', product_category) AS category,
  SUM(revenue) AS total_revenue,
  COUNT(*) AS num_sales
FROM sales
GROUP BY region, product_category WITH ROLLUP
ORDER BY
  GROUPING(region),
  GROUPING(product_category),
  region,
  product_category;
```

## Using GROUPING() in a CASE Expression

```sql
SELECT
  CASE
    WHEN GROUPING(department) = 1 THEN 'Grand Total'
    ELSE department
  END AS department_label,
  SUM(salary) AS total_salary
FROM employees
GROUP BY department WITH ROLLUP;
```

## Summary

The `GROUPING()` function in MySQL 8 resolves the ambiguity of NULL values in `WITH ROLLUP` query results by returning `1` for super-aggregate rows and `0` for actual data. Use it with `IF()`, `CASE`, or `COALESCE` to produce readable subtotal and grand total labels in financial and analytics reports, and use it in `HAVING` to filter only the aggregate or non-aggregate rows.
