# How to Use Window Frame Specifications (ROWS/RANGE) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, ROWS, Range, Frame Specification

Description: Learn how ROWS and RANGE frame specifications work in ClickHouse window functions, and when to use each for sliding windows and running aggregations.

---

## What Are Window Frame Specifications

A window frame defines the subset of rows included in each window function calculation. Without a frame specification, the default behavior depends on whether `ORDER BY` is present:

- Without `ORDER BY`: all rows in the partition
- With `ORDER BY`: rows from the start of the partition to the current row

## ROWS vs RANGE

| Mode | Description |
|------|-------------|
| `ROWS` | Physical row positions relative to current row |
| `RANGE` | Logical value ranges relative to current row's ORDER BY value |

```sql
-- ROWS: based on row count
ROWS BETWEEN 3 PRECEDING AND CURRENT ROW  -- exactly 3 rows before + current

-- RANGE: based on value distance
RANGE BETWEEN 3 PRECEDING AND CURRENT ROW  -- values within 3 units of current value
```

## Frame Boundary Options

```sql
-- Boundary keywords:
-- UNBOUNDED PRECEDING: first row of partition
-- N PRECEDING: N rows/values before current
-- CURRENT ROW: current row
-- N FOLLOWING: N rows/values after current
-- UNBOUNDED FOLLOWING: last row of partition

-- Common frame patterns:
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW   -- running total
ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING  -- whole partition
ROWS BETWEEN 6 PRECEDING AND CURRENT ROW           -- 7-day window
ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING           -- centered window
```

## ROWS Examples

```sql
CREATE TABLE measurements (
    ts DateTime,
    value Float64
) ENGINE = MergeTree()
ORDER BY ts;

-- ROWS: physical row boundaries
SELECT
    ts,
    value,
    -- Last 7 rows (including current)
    avg(value) OVER (ORDER BY ts ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg_7rows,
    -- Current + 3 ahead (lookahead window)
    avg(value) OVER (ORDER BY ts ROWS BETWEEN CURRENT ROW AND 3 FOLLOWING) AS avg_next_3rows,
    -- Centered 5-row window
    avg(value) OVER (ORDER BY ts ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING) AS avg_centered_5rows,
    -- Full partition aggregate (same for all rows)
    avg(value) OVER (ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS avg_all
FROM measurements
ORDER BY ts;
```

## RANGE Examples

```sql
-- RANGE: value-based boundaries
-- Useful when ORDER BY is a numeric or date column
SELECT
    ts,
    value,
    -- All rows within 1 hour of current row's timestamp
    avg(value) OVER (
        ORDER BY toUnixTimestamp(ts)
        RANGE BETWEEN 3600 PRECEDING AND CURRENT ROW  -- 3600 seconds = 1 hour
    ) AS avg_last_hour
FROM measurements
ORDER BY ts;

-- RANGE with Date: values within N days
SELECT
    metric_date,
    daily_value,
    avg(daily_value) OVER (
        ORDER BY toUInt32(metric_date)
        RANGE BETWEEN 6 PRECEDING AND CURRENT ROW  -- last 7 days of dates
    ) AS trailing_7day_avg
FROM daily_metrics;
```

## Key Difference: ROWS vs RANGE with Ties

```sql
-- Example data with duplicate timestamps
-- ts: 10, 10, 20, 30

-- ROWS BETWEEN 1 PRECEDING AND CURRENT ROW (physical positions):
-- Row 1 (ts=10): only row 1
-- Row 2 (ts=10): rows 1,2
-- Row 3 (ts=20): rows 2,3
-- Row 4 (ts=30): rows 3,4

-- RANGE BETWEEN 1 PRECEDING AND CURRENT ROW (value range, ts is 10,10,20,30):
-- Row 1 (ts=10): rows with ts in [9,10] = rows 1,2
-- Row 2 (ts=10): rows with ts in [9,10] = rows 1,2
-- Row 3 (ts=20): rows with ts in [19,20] = row 3
-- Row 4 (ts=30): rows with ts in [29,30] = row 4
```

## Default Frame Behavior

```sql
-- No ORDER BY: all partition rows
SELECT avg(value) OVER (PARTITION BY category) FROM t;
-- Frame: ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING

-- ORDER BY present, no frame: rows up to current
SELECT avg(value) OVER (ORDER BY ts) FROM t;
-- Frame: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (ClickHouse default)
```

## Practical Example: Sliding Window Metrics

```sql
CREATE TABLE server_metrics (
    ts DateTime,
    server_id UInt32,
    cpu_pct Float32,
    memory_mb UInt32
) ENGINE = MergeTree()
ORDER BY (server_id, ts);

-- 5-minute sliding window averages (5 minute = 300 seconds)
SELECT
    server_id,
    ts,
    cpu_pct,
    avg(cpu_pct) OVER (
        PARTITION BY server_id
        ORDER BY toUnixTimestamp(ts)
        RANGE BETWEEN 300 PRECEDING AND CURRENT ROW  -- 5-minute RANGE window
    ) AS cpu_5min_avg,
    max(cpu_pct) OVER (
        PARTITION BY server_id
        ORDER BY toUnixTimestamp(ts)
        RANGE BETWEEN 300 PRECEDING AND CURRENT ROW
    ) AS cpu_5min_max
FROM server_metrics
ORDER BY server_id, ts;
```

## Named Windows (WINDOW Clause)

```sql
-- Reuse window definition with WINDOW clause
SELECT
    ts,
    value,
    sum(value) OVER w AS running_sum,
    avg(value) OVER w AS running_avg,
    max(value) OVER w AS running_max
FROM measurements
WINDOW w AS (ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
ORDER BY ts;
```

## Summary

Window frame specifications in ClickHouse define which rows participate in each window function calculation. `ROWS` frames use physical row positions for exact N-row sliding windows, while `RANGE` frames use value boundaries for time-range or value-range windows that handle data gaps naturally. The most common patterns are `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` for running totals, `ROWS BETWEEN N PRECEDING AND CURRENT ROW` for fixed-size rolling windows, and `RANGE BETWEEN N PRECEDING AND CURRENT ROW` for time-based sliding windows.
