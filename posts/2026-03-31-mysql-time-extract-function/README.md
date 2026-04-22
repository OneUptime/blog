# How to Use TIME() Function to Extract Time in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Time Function, Database

Description: Learn how MySQL's TIME() function extracts the time portion from a DATETIME or TIMESTAMP value, with examples for time-based filtering and scheduling.

---

## What is TIME()?

The `TIME()` function in MySQL extracts the time component (hours, minutes, and seconds) from a `DATETIME`, `TIMESTAMP`, or time expression, returning a `TIME` value in `HH:MM:SS` format. It is useful when you only care about what time of day an event occurred, regardless of the date.

The syntax is:

```sql
TIME(expr)
```

`expr` can be a `DATETIME`, `TIMESTAMP`, `TIME`, or a string in a recognizable format.

## Basic Examples

```sql
SELECT TIME('2026-03-31 14:22:07');
-- Result: 14:22:07

SELECT TIME(NOW());
-- Result: 14:22:07  (current time)

SELECT TIME('2026-03-31');
-- Result: 00:00:00  (no time component, defaults to midnight)
```

## Filtering Records by Time of Day

Find all orders placed in the morning (before noon):

```sql
SELECT *
FROM orders
WHERE TIME(created_at) < '12:00:00';
```

Find transactions during business hours:

```sql
SELECT *
FROM transactions
WHERE TIME(created_at) BETWEEN '09:00:00' AND '17:00:00';
```

Find after-hours activity:

```sql
SELECT *
FROM login_events
WHERE TIME(logged_at) NOT BETWEEN '08:00:00' AND '18:00:00';
```

## Aggregating by Hour of Day

Analyze traffic patterns by hour:

```sql
SELECT
  HOUR(TIME(created_at)) AS hour_of_day,
  COUNT(*) AS request_count
FROM api_requests
GROUP BY HOUR(TIME(created_at))
ORDER BY hour_of_day;
```

This identifies peak usage hours across all dates.

## Comparing Time Components

Find records where the stored time matches the current time within a window:

```sql
SELECT *
FROM scheduled_jobs
WHERE ABS(TIME_TO_SEC(TIME(scheduled_at)) - TIME_TO_SEC(CURTIME())) < 300;
```

## Extracting Time for Joins

Join records where the time of day falls in the same shift:

```sql
SELECT
  e.employee_id,
  s.shift_name
FROM events e
JOIN shifts s
  ON TIME(e.event_time) BETWEEN s.start_time AND s.end_time;
```

## TIME() with Arithmetic

Add or subtract time intervals:

```sql
SELECT TIME(created_at) + INTERVAL 2 HOUR AS adjusted_time
FROM logs;

SELECT ADDTIME(TIME(created_at), '01:30:00') AS offset_time
FROM appointments;
```

## TIMEDIFF() with TIME()

Calculate the duration between two events on the same day:

```sql
SELECT
  session_id,
  TIME(start_event) AS session_start,
  TIME(end_event) AS session_end,
  TIMEDIFF(TIME(end_event), TIME(start_event)) AS duration
FROM user_sessions;
```

## TIME() with Fractional Seconds

If your column stores fractional seconds, `TIME()` preserves them:

```sql
SELECT TIME('2026-03-31 14:22:07.413');
-- Result: 14:22:07.413
```

## TIME() vs EXTRACT() vs HOUR()/MINUTE()/SECOND()

```sql
-- Full time portion
SELECT TIME(NOW());                    -- 14:22:07

-- Individual numeric components
SELECT HOUR(NOW());                    -- 14
SELECT MINUTE(NOW());                  -- 22
SELECT SECOND(NOW());                  -- 7

-- EXTRACT equivalent
SELECT EXTRACT(HOUR FROM NOW());       -- 14
SELECT EXTRACT(MINUTE FROM NOW());     -- 22
```

Use `TIME()` when you need the full time value for comparison or storage. Use `HOUR()`, `MINUTE()`, `SECOND()` when you need individual numeric components for calculations or grouping.

## Performance Note

Like `DATE()`, using `TIME()` on an indexed column in a `WHERE` clause prevents index usage. Note that `HOUR()` has the same limitation - any function wrapping a column prevents index seeks:

```sql
-- Not index-friendly (function wraps the column)
WHERE TIME(created_at) < '12:00:00'

-- Also not index-friendly (HOUR() still wraps the column)
WHERE HOUR(created_at) < 12

-- Index-friendly alternatives:
-- 1. Functional index (MySQL 8.0.13+)
CREATE INDEX idx_hour ON orders ((HOUR(created_at)));

-- 2. Generated column with a regular index
ALTER TABLE orders ADD hour_created TINYINT GENERATED ALWAYS AS (HOUR(created_at)) STORED;
CREATE INDEX idx_hour_created ON orders (hour_created);
```

## Summary

`TIME()` extracts the `HH:MM:SS` time portion from a `DATETIME`, `TIMESTAMP`, or string value. It is used for time-of-day filtering, shift-based joins, duration calculations, and hourly aggregation. Use `HOUR()`, `MINUTE()`, and `SECOND()` for numeric components, and prefer explicit predicates over `TIME()` on indexed columns for performance-critical queries.
