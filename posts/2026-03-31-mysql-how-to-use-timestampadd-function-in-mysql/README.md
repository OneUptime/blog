# How to Use TIMESTAMPADD() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, TIMESTAMPADD, Date Arithmetic, Date Function, SQL

Description: Learn how to use MySQL's TIMESTAMPADD() function to add a specified number of time units to a datetime value for scheduling and expiry calculations.

---

## Overview

`TIMESTAMPADD()` adds a specified integer amount of a time unit to a `DATETIME` or `DATE` expression and returns a new `DATETIME`. It is the functional equivalent of `DATE_ADD()` with `INTERVAL`, but uses a function-style syntax that some developers find more readable, especially in stored procedures and dynamic SQL.

## Basic Syntax

```sql
TIMESTAMPADD(unit, interval, datetime_expr)
```

Supported units: `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`.

The `interval` can be negative to subtract time.

## Basic Examples

```sql
-- Add 1 hour
SELECT TIMESTAMPADD(HOUR, 1, '2024-06-15 08:00:00');   -- 2024-06-15 09:00:00

-- Add 30 minutes
SELECT TIMESTAMPADD(MINUTE, 30, '2024-06-15 08:00:00'); -- 2024-06-15 08:30:00

-- Add 7 days
SELECT TIMESTAMPADD(DAY, 7, '2024-06-15');              -- 2024-06-22

-- Add 3 months
SELECT TIMESTAMPADD(MONTH, 3, '2024-06-15');            -- 2024-09-15

-- Add 1 year
SELECT TIMESTAMPADD(YEAR, 1, '2024-06-15');             -- 2025-06-15

-- Subtract time using a negative interval
SELECT TIMESTAMPADD(DAY, -7, CURDATE());                -- 7 days ago
```

## Scheduling and Expiry Calculations

```sql
-- Set session expiry to 30 minutes from now
SELECT TIMESTAMPADD(MINUTE, 30, NOW()) AS session_expires;

-- Set password reset token expiry to 1 hour
INSERT INTO password_resets (user_id, token, expires_at)
VALUES (42, 'abc123', TIMESTAMPADD(HOUR, 1, NOW()));

-- Calculate subscription end date
INSERT INTO subscriptions (user_id, start_date, end_date, plan_months)
VALUES (100, CURDATE(), TIMESTAMPADD(MONTH, 12, CURDATE()), 12);
```

## Updating Expiry Dates in Bulk

```sql
-- Extend all active subscriptions by 30 days (COVID extension example)
UPDATE subscriptions
SET end_date = TIMESTAMPADD(DAY, 30, end_date)
WHERE status = 'active';

-- Push all scheduled tasks forward by 1 week
UPDATE scheduled_tasks
SET run_at = TIMESTAMPADD(WEEK, 1, run_at)
WHERE run_at > NOW() AND status = 'pending';
```

## Using TIMESTAMPADD() with TIMESTAMPDIFF()

```sql
-- Round a datetime down to the nearest 15-minute bucket
SELECT
  TIMESTAMPADD(
    MINUTE,
    FLOOR(TIMESTAMPDIFF(MINUTE, '2024-01-01', NOW()) / 15) * 15,
    '2024-01-01'
  ) AS bucket_start;
```

## Generating a Series of Future Dates

```sql
-- Generate 5 weekly intervals from today
SELECT TIMESTAMPADD(WEEK, n, CURDATE()) AS future_date
FROM (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2
  UNION ALL SELECT 3 UNION ALL SELECT 4
) weeks;
```

## TIMESTAMPADD() vs DATE_ADD() with INTERVAL

```sql
-- These two statements are equivalent
SELECT DATE_ADD('2024-06-15', INTERVAL 3 MONTH);
SELECT TIMESTAMPADD(MONTH, 3, '2024-06-15');
```

Prefer `DATE_ADD()` with `INTERVAL` for ad-hoc queries (it is the idiomatic MySQL syntax). Prefer `TIMESTAMPADD()` in stored procedures when the unit and value are variables, as it accepts expressions more cleanly. Note that neither function is part of the SQL standard - standard SQL uses `datetime + INTERVAL` arithmetic - but both are well-supported in MySQL.

## Practical Example: Meeting Slot Generator

```sql
-- Generate a series of 1-hour meeting slots for a given day
SELECT
  TIMESTAMPADD(HOUR, n, '2024-06-15 09:00:00') AS slot_start,
  TIMESTAMPADD(HOUR, n + 1, '2024-06-15 09:00:00') AS slot_end
FROM (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2
  UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7
) slots;
```

## Summary

`TIMESTAMPADD()` adds a given number of time units to a datetime value, supporting units from seconds to years. It is functionally equivalent to `DATE_ADD(date, INTERVAL n unit)` and is particularly convenient in stored procedures where unit and interval are dynamic. Use negative interval values to subtract time rather than using `DATE_SUB()`.
