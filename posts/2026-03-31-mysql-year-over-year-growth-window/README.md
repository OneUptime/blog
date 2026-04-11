# How to Calculate Year-Over-Year Growth with Window Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Analytics, SQL, Query

Description: Learn how to calculate year-over-year growth percentages in MySQL using LAG() window functions and date-based partitioning for business analytics.

---

## Why Window Functions for YoY Growth?

Year-over-year (YoY) growth compares a metric from one period to the same period in the prior year. Without window functions, this typically requires a self-join or correlated subquery. With `LAG()`, you can reference the previous year's value directly in the same row, keeping the query concise and readable.

## Setting Up Sample Data

```sql
CREATE TABLE monthly_revenue (
  year_num  INT,
  month_num INT,
  revenue   DECIMAL(12, 2)
);

INSERT INTO monthly_revenue VALUES
  (2023, 1, 42000), (2023, 2, 38000), (2023, 3, 51000),
  (2023, 4, 47000), (2023, 5, 55000), (2023, 6, 60000),
  (2024, 1, 50000), (2024, 2, 44000), (2024, 3, 59000),
  (2024, 4, 53000), (2024, 5, 63000), (2024, 6, 70000);
```

## Basic YoY Calculation with LAG()

```sql
SELECT
  year_num,
  month_num,
  revenue,
  LAG(revenue) OVER (PARTITION BY month_num ORDER BY year_num) AS prev_year_revenue,
  ROUND(
    (revenue - LAG(revenue) OVER (PARTITION BY month_num ORDER BY year_num))
    / LAG(revenue) OVER (PARTITION BY month_num ORDER BY year_num) * 100,
    2
  ) AS yoy_growth_pct
FROM monthly_revenue
ORDER BY year_num, month_num;
```

`PARTITION BY month_num` groups rows by month so each January is compared to the prior January, each February to the prior February, and so on.

## Cleaner Version Using a CTE

Repeating the `LAG()` call three times can be error-prone. A CTE avoids that:

```sql
WITH base AS (
  SELECT
    year_num,
    month_num,
    revenue,
    LAG(revenue) OVER (PARTITION BY month_num ORDER BY year_num) AS prev_revenue
  FROM monthly_revenue
)
SELECT
  year_num,
  month_num,
  revenue,
  prev_revenue,
  ROUND((revenue - prev_revenue) / prev_revenue * 100, 2) AS yoy_pct
FROM base
WHERE prev_revenue IS NOT NULL
ORDER BY year_num, month_num;
```

The `WHERE prev_revenue IS NOT NULL` filters out the first year's rows, which have no prior year to compare against.

## Annual YoY Growth

To compare full-year totals, aggregate first, then apply `LAG()`:

```sql
WITH annual AS (
  SELECT
    year_num,
    SUM(revenue) AS total_revenue
  FROM monthly_revenue
  GROUP BY year_num
)
SELECT
  year_num,
  total_revenue,
  LAG(total_revenue) OVER (ORDER BY year_num) AS prev_year_total,
  ROUND(
    (total_revenue - LAG(total_revenue) OVER (ORDER BY year_num))
    / LAG(total_revenue) OVER (ORDER BY year_num) * 100,
    2
  ) AS yoy_growth_pct
FROM annual;
```

## Handling Division by Zero

If a prior year's revenue could be zero, protect against division by zero using `NULLIF()`:

```sql
ROUND(
  (revenue - prev_revenue) / NULLIF(prev_revenue, 0) * 100,
  2
) AS yoy_pct
```

`NULLIF(prev_revenue, 0)` returns `NULL` when `prev_revenue` is zero, so the division result is `NULL` rather than an error.

## Multi-Metric YoY Comparison

You can compute YoY for multiple metrics in one query. This example assumes the table has an additional `units_sold` column (`ALTER TABLE monthly_revenue ADD COLUMN units_sold INT;`):

```sql
WITH base AS (
  SELECT
    year_num,
    month_num,
    revenue,
    units_sold,
    LAG(revenue)    OVER (PARTITION BY month_num ORDER BY year_num) AS prev_rev,
    LAG(units_sold) OVER (PARTITION BY month_num ORDER BY year_num) AS prev_units
  FROM monthly_revenue
)
SELECT
  year_num,
  month_num,
  ROUND((revenue - prev_rev) / NULLIF(prev_rev, 0) * 100, 2) AS rev_yoy_pct,
  ROUND((units_sold - prev_units) / NULLIF(prev_units, 0) * 100, 2) AS units_yoy_pct
FROM base
WHERE prev_rev IS NOT NULL;
```

## Indexing for Performance

```sql
ALTER TABLE monthly_revenue
  ADD INDEX idx_month_year (month_num, year_num);
```

The index supports both the `PARTITION BY month_num ORDER BY year_num` pattern and point lookups.

## Summary

Calculating year-over-year growth in MySQL is clean and efficient with `LAG()` window functions. By partitioning on the repeating period (month, quarter) and ordering by year, you pull the prior year's value into each row without self-joins. Wrap the calculation in a CTE for readability and use `NULLIF()` to safely handle zero baselines.
