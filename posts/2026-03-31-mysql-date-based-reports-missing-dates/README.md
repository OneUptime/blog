# How to Generate Date-Based Reports Even for Missing Dates in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Report, Calendar Table, LEFT JOIN, Gap

Description: Learn how to generate complete date-based MySQL reports that include rows for every date - even days with no data - using calendar tables and recursive CTEs.

---

## The Problem: Missing Dates in GROUP BY Reports

When you group data by date, MySQL only produces rows for dates that have data. If no orders exist on a Sunday, that Sunday is absent from the report. This creates misleading charts and breaks time-series calculations.

## Generating a Date Range with a Recursive CTE

Create an inline date sequence covering your report range:

```sql
WITH RECURSIVE date_range AS (
  SELECT CURDATE() - INTERVAL 29 DAY AS dt
  UNION ALL
  SELECT dt + INTERVAL 1 DAY
  FROM date_range
  WHERE dt < CURDATE()
)
SELECT dt FROM date_range;
```

## LEFT JOIN the Date Range to Your Data

Join the generated dates to your facts table so every date appears, even with zero values:

```sql
WITH RECURSIVE date_range AS (
  SELECT CURDATE() - INTERVAL 29 DAY AS dt
  UNION ALL
  SELECT dt + INTERVAL 1 DAY
  FROM date_range
  WHERE dt < CURDATE()
)
SELECT
  dr.dt                          AS report_date,
  COALESCE(COUNT(o.id), 0)      AS order_count,
  COALESCE(SUM(o.total_amount), 0) AS revenue
FROM date_range dr
LEFT JOIN orders o ON DATE(o.order_date) = dr.dt
GROUP BY dr.dt
ORDER BY dr.dt;
```

## Using a Persistent Calendar Table

For recurring reports, a permanent calendar table is more efficient than a recursive CTE:

```sql
CREATE TABLE IF NOT EXISTS calendar (
  dt DATE NOT NULL PRIMARY KEY,
  day_of_week TINYINT UNSIGNED,
  is_weekend TINYINT(1) GENERATED ALWAYS AS (DAYOFWEEK(dt) IN (1, 7)) STORED
) ENGINE=InnoDB;

-- Populate once (raise recursion limit for the ~4 000 rows needed)
SET SESSION cte_max_recursion_depth = 5000;

INSERT INTO calendar (dt, day_of_week)
WITH RECURSIVE dates AS (
  SELECT '2020-01-01' AS dt
  UNION ALL
  SELECT dt + INTERVAL 1 DAY FROM dates WHERE dt < '2030-12-31'
)
SELECT dt, DAYOFWEEK(dt) FROM dates
ON DUPLICATE KEY UPDATE dt = dt;
```

Then use it in reports:

```sql
SELECT
  c.dt                             AS report_date,
  c.is_weekend,
  COALESCE(SUM(o.total_amount), 0) AS revenue
FROM calendar c
LEFT JOIN orders o ON DATE(o.order_date) = c.dt
WHERE c.dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY c.dt, c.is_weekend
ORDER BY c.dt;
```

## Monthly Report with All Days Shown

Show all calendar days in a month, even with no activity:

```sql
WITH RECURSIVE month_days AS (
  SELECT DATE('2025-01-01') AS dt
  UNION ALL
  SELECT dt + INTERVAL 1 DAY
  FROM month_days
  WHERE dt < LAST_DAY('2025-01-01')
)
SELECT
  md.dt,
  DAYNAME(md.dt)                    AS day_name,
  COALESCE(COUNT(o.id), 0)          AS orders,
  COALESCE(SUM(o.total_amount), 0)  AS revenue
FROM month_days md
LEFT JOIN orders o ON DATE(o.order_date) = md.dt
GROUP BY md.dt
ORDER BY md.dt;
```

## Filling Zeros vs. NULL

Use `COALESCE(value, 0)` to fill missing data with 0 for numeric metrics, but leave it NULL for ratios to avoid dividing by zero:

```sql
SELECT
  dr.dt,
  COALESCE(COUNT(o.id), 0)          AS orders,
  COALESCE(SUM(o.total_amount), 0)  AS revenue,
  CASE WHEN COUNT(o.id) > 0
    THEN ROUND(SUM(o.total_amount) / COUNT(o.id), 2)
    ELSE NULL
  END AS avg_order_value
FROM date_range dr
LEFT JOIN orders o ON DATE(o.order_date) = dr.dt
GROUP BY dr.dt;
```

## Summary

Generate complete date-based reports in MySQL by creating a date range with a recursive CTE or a calendar table, then using a `LEFT JOIN` to the data table. `COALESCE` fills missing numeric values with 0. For repeated reports, a persistent calendar table is more performant than an inline CTE.
