# How to Use TIMESTAMPDIFF() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, TIMESTAMPDIFF, Date Difference, Date Function, SQL

Description: Learn how to use MySQL's TIMESTAMPDIFF() function to calculate the difference between two datetime values in any unit from seconds to years.

---

## Overview

`TIMESTAMPDIFF()` computes the difference between two datetime expressions in a specified unit. Unlike `DATEDIFF()`, which only works at the day level, `TIMESTAMPDIFF()` supports units ranging from seconds to years, making it versatile for age calculations, duration reporting, and SLA measurements.

## Basic Syntax

```sql
TIMESTAMPDIFF(unit, datetime_expr1, datetime_expr2)
```

Returns `datetime_expr2 - datetime_expr1` in the specified `unit`. The result is negative if `datetime_expr1` is later than `datetime_expr2`.

Supported units: `MICROSECOND`, `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`.

## Basic Examples

```sql
-- Difference in days
SELECT TIMESTAMPDIFF(DAY, '2024-01-01', '2024-06-15');   -- 166

-- Difference in months
SELECT TIMESTAMPDIFF(MONTH, '2024-01-01', '2024-06-15'); -- 5

-- Difference in years
SELECT TIMESTAMPDIFF(YEAR, '1990-05-20', CURDATE());     -- age in years

-- Difference in hours
SELECT TIMESTAMPDIFF(HOUR, '2024-06-15 08:00:00', '2024-06-15 14:30:00'); -- 6

-- Difference in minutes
SELECT TIMESTAMPDIFF(MINUTE, '2024-06-15 08:00:00', '2024-06-15 14:30:00'); -- 390

-- Difference in seconds
SELECT TIMESTAMPDIFF(SECOND, '2024-06-15 08:00:00', '2024-06-15 08:01:30'); -- 90
```

## Calculating Age

```sql
-- Calculate user age in years
SELECT
  name,
  birth_date,
  TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) AS age_years
FROM users;

-- Age in years, months, and days
SELECT
  name,
  birth_date,
  TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) AS years,
  TIMESTAMPDIFF(MONTH, birth_date, CURDATE()) % 12 AS months,
  TIMESTAMPDIFF(DAY,
    DATE_ADD(birth_date,
      INTERVAL TIMESTAMPDIFF(MONTH, birth_date, CURDATE()) MONTH),
    CURDATE()
  ) AS days
FROM users;
```

## Measuring SLA and Response Times

```sql
-- Calculate ticket resolution time in hours
SELECT
  ticket_id,
  created_at,
  resolved_at,
  TIMESTAMPDIFF(HOUR, created_at, resolved_at) AS resolution_hours
FROM support_tickets
WHERE resolved_at IS NOT NULL;

-- Find tickets that breached 24-hour SLA
SELECT ticket_id, created_at, resolved_at
FROM support_tickets
WHERE TIMESTAMPDIFF(HOUR, created_at, IFNULL(resolved_at, NOW())) > 24;
```

## Subscription Duration and Expiry

```sql
-- Days until subscription expires
SELECT
  user_id,
  expiry_date,
  TIMESTAMPDIFF(DAY, CURDATE(), expiry_date) AS days_remaining
FROM subscriptions
WHERE expiry_date > CURDATE()
ORDER BY days_remaining;

-- Subscriptions expiring within 7 days
SELECT * FROM subscriptions
WHERE TIMESTAMPDIFF(DAY, CURDATE(), expiry_date) BETWEEN 0 AND 7;
```

## Difference Between TIMESTAMPDIFF() and DATEDIFF()

```sql
-- DATEDIFF only computes full days, ignoring time
SELECT DATEDIFF('2024-06-15 23:59:59', '2024-06-14 00:00:00');   -- 1

-- TIMESTAMPDIFF(DAY,...) also truncates to full days
SELECT TIMESTAMPDIFF(DAY, '2024-06-14 00:00:00', '2024-06-15 23:59:59'); -- 1

-- But TIMESTAMPDIFF(HOUR,...) gives the full picture
SELECT TIMESTAMPDIFF(HOUR, '2024-06-14 00:00:00', '2024-06-15 23:59:59'); -- 47
```

## Grouping by Duration Buckets

```sql
-- Classify orders by fulfillment speed
SELECT
  CASE
    WHEN TIMESTAMPDIFF(HOUR, ordered_at, shipped_at) <= 24 THEN 'Same Day'
    WHEN TIMESTAMPDIFF(HOUR, ordered_at, shipped_at) <= 48 THEN 'Next Day'
    ELSE 'Slow'
  END AS fulfillment_category,
  COUNT(*) AS order_count
FROM orders
WHERE shipped_at IS NOT NULL
GROUP BY fulfillment_category;
```

## Summary

`TIMESTAMPDIFF()` is the most flexible MySQL function for computing time differences, supporting units from seconds to years. It is the correct choice for age calculations, SLA tracking, subscription expiry checks, and duration reporting. Always pass the earlier datetime as the first argument to get a positive result, and use `IFNULL(resolved_at, NOW())` to handle open/unresolved records.
