# How to Identify Gaps in Date Sequences in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Lag, Gap Detection, Date

Description: Learn how to find gaps in date sequences in MySQL using LAG() window functions, recursive CTEs, and calendar table joins to identify missing dates.

---

## Why Date Gaps Matter

Missing dates in time-series data indicate data collection failures, skipped business days, or incomplete imports. Detecting these gaps is essential for data quality monitoring, SLA audits, and financial reporting.

## Using LAG() to Find Date Gaps

`LAG()` retrieves the previous row's date, letting you compute the interval between consecutive dates:

```sql
SELECT
  curr_date,
  prev_date,
  DATEDIFF(curr_date, prev_date) AS days_gap
FROM (
  SELECT
    login_date AS curr_date,
    LAG(login_date) OVER (ORDER BY login_date) AS prev_date
  FROM (
    SELECT DISTINCT DATE(created_at) AS login_date
    FROM user_sessions
  ) daily
) gaps
WHERE DATEDIFF(curr_date, prev_date) > 1
ORDER BY curr_date;
```

Any row with `days_gap > 1` represents a gap.

## Showing the Missing Dates Explicitly

To enumerate which dates are actually missing in a gap:

```sql
WITH date_gaps AS (
  SELECT
    login_date AS curr_date,
    LAG(login_date) OVER (ORDER BY login_date) AS prev_date
  FROM (SELECT DISTINCT DATE(created_at) AS login_date FROM user_sessions) d
),
gap_ranges AS (
  SELECT
    prev_date + INTERVAL 1 DAY AS gap_start,
    curr_date - INTERVAL 1 DAY AS gap_end
  FROM date_gaps
  WHERE DATEDIFF(curr_date, prev_date) > 1
)
SELECT gap_start, gap_end,
       DATEDIFF(gap_end, gap_start) + 1 AS missing_days
FROM gap_ranges
ORDER BY gap_start;
```

## Using a Calendar Table

A pre-built calendar table is the most flexible approach for gap detection:

```sql
-- Create a calendar table
CREATE TABLE calendar (dt DATE PRIMARY KEY);
SET SESSION cte_max_recursion_depth = 5000;
INSERT INTO calendar (dt)
WITH RECURSIVE dates AS (
  SELECT CAST('2020-01-01' AS DATE) AS dt
  UNION ALL
  SELECT dt + INTERVAL 1 DAY FROM dates WHERE dt < '2030-12-31'
)
SELECT dt FROM dates;

-- Find dates with no activity
SELECT c.dt AS missing_date
FROM calendar c
WHERE c.dt BETWEEN '2025-01-01' AND '2025-12-31'
  AND NOT EXISTS (
    SELECT 1 FROM user_sessions s
    WHERE DATE(s.created_at) = c.dt
  )
ORDER BY c.dt;
```

## Finding Gaps Per User

Detect per-user date gaps with `PARTITION BY`:

```sql
SELECT
  user_id,
  prev_date + INTERVAL 1 DAY AS gap_start,
  curr_date - INTERVAL 1 DAY AS gap_end,
  DATEDIFF(curr_date, prev_date) - 1 AS missing_days
FROM (
  SELECT
    user_id,
    DATE(created_at) AS curr_date,
    LAG(DATE(created_at)) OVER (PARTITION BY user_id ORDER BY DATE(created_at)) AS prev_date
  FROM user_sessions
) t
WHERE DATEDIFF(curr_date, prev_date) > 1
ORDER BY user_id, gap_start;
```

## Finding Gaps in Numeric ID Sequences

Apply the same technique to integer sequences:

```sql
SELECT
  prev_id + 1 AS gap_start,
  curr_id - 1 AS gap_end,
  curr_id - prev_id - 1 AS missing_count
FROM (
  SELECT
    id AS curr_id,
    LAG(id) OVER (ORDER BY id) AS prev_id
  FROM orders
) t
WHERE curr_id - prev_id > 1
ORDER BY gap_start;
```

## Summary

Identify date gaps in MySQL using `LAG()` to compare consecutive dates and filter where the difference exceeds 1 day. Use `PARTITION BY` for per-user gap detection. For dense gap enumeration, join against a calendar table. Apply the same pattern to numeric sequences by comparing consecutive IDs.
