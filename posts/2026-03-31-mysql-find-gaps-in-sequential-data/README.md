# How to Find Gaps in Sequential Data in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Gap Detection, Query, Sequence, Window Function

Description: Detect missing values in sequential MySQL data such as ID gaps, missing dates, or breaks in number sequences using self-joins and window functions.

---

## Why Find Gaps?

Gaps in sequential data can indicate missing records, failed inserts, or data integrity issues. Common scenarios include: missing order IDs in an auto-increment sequence, missing dates in a time series, or skipped invoice numbers in financial data.

## Sample Data - ID Sequence with Gaps

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  created_at DATETIME
);

INSERT INTO orders (id, customer_id, created_at) VALUES
(1, 101, '2024-01-01'),
(2, 102, '2024-01-02'),
(5, 103, '2024-01-05'),
(6, 104, '2024-01-06'),
(10, 105, '2024-01-10');
-- Missing: 3, 4, 7, 8, 9
```

## Method 1 - Self-Join to Find Gap Starts

```sql
SELECT
  a.id + 1 AS gap_start,
  MIN(b.id) - 1 AS gap_end
FROM orders a
JOIN orders b ON b.id > a.id
GROUP BY a.id
HAVING gap_start < MIN(b.id)
ORDER BY gap_start;
```

Result:

```text
+-----------+---------+
| gap_start | gap_end |
+-----------+---------+
|         3 |       4 |
|         7 |       9 |
+-----------+---------+
```

## Method 2 - LAG Window Function (MySQL 8.0+)

```sql
SELECT
  prev_id + 1 AS gap_start,
  id - 1 AS gap_end,
  id - prev_id - 1 AS gap_size
FROM (
  SELECT
    id,
    LAG(id, 1, 0) OVER (ORDER BY id) AS prev_id
  FROM orders
) t
WHERE id - prev_id > 1
ORDER BY gap_start;
```

This is cleaner and more efficient than the self-join approach.

## Finding Missing Dates in a Time Series

```sql
CREATE TABLE daily_metrics (
  metric_date DATE PRIMARY KEY,
  value DECIMAL(10,2)
);

INSERT INTO daily_metrics VALUES
('2024-01-01', 100),
('2024-01-02', 150),
('2024-01-04', 200),  -- Jan 3 missing
('2024-01-07', 120);  -- Jan 5, 6 missing
```

Using a calendar table approach - generate a date range and left join:

```sql
-- Generate date range with a recursive CTE (MySQL 8.0+)
WITH RECURSIVE date_range AS (
  SELECT MIN(metric_date) AS d FROM daily_metrics
  UNION ALL
  SELECT d + INTERVAL 1 DAY
  FROM date_range
  WHERE d < (SELECT MAX(metric_date) FROM daily_metrics)
)
SELECT dr.d AS missing_date
FROM date_range dr
LEFT JOIN daily_metrics dm ON dr.d = dm.metric_date
WHERE dm.metric_date IS NULL
ORDER BY dr.d;
```

Result:

```text
+--------------+
| missing_date |
+--------------+
| 2024-01-03   |
| 2024-01-05   |
| 2024-01-06   |
+--------------+
```

## Finding Invoice Number Gaps with Range Display

```sql
WITH RECURSIVE nums AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < (SELECT MAX(invoice_num) FROM invoices)
)
SELECT n AS missing_invoice
FROM nums
LEFT JOIN invoices ON nums.n = invoices.invoice_num
WHERE invoices.invoice_num IS NULL
  AND n >= (SELECT MIN(invoice_num) FROM invoices)
LIMIT 100;
```

Set `cte_max_recursion_depth` if needed for large ranges:

```sql
SET SESSION cte_max_recursion_depth = 100000;
```

## Checking for Auto-Increment Gaps

```sql
SELECT
  MIN(id) AS first_id,
  MAX(id) AS last_id,
  COUNT(*) AS row_count,
  MAX(id) - MIN(id) + 1 AS expected_count,
  MAX(id) - MIN(id) + 1 - COUNT(*) AS gap_count
FROM orders;
```

## Summary

Finding gaps in sequential MySQL data requires comparing each row to its neighbor. For ID sequences, the LAG window function is the most elegant approach in MySQL 8.0+. For date gaps, generate a complete date range using a recursive CTE and left-join it against your data to find missing dates. The self-join method works for MySQL 5.7 and earlier when window functions are unavailable.
