# How to Use date_diff() with Different Units in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, date_diff, SQL, Analytics

Description: Learn how to use date_diff() in ClickHouse to calculate the difference between two dates or timestamps in seconds, hours, days, months, and years.

---

## Overview

`date_diff()` (also aliased as `dateDiff()`) calculates the difference between two date or datetime values in a specified unit. It is the standard ClickHouse function for measuring elapsed time between events.

## Basic Syntax

```sql
date_diff('unit', start_datetime, end_datetime [, timezone])
```

The unit can be one of: `second`, `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`.

## Examples by Unit

```sql
SELECT
    date_diff('second',  toDateTime('2024-06-01 10:00:00'), toDateTime('2024-06-01 10:05:30')) AS seconds_diff,
    date_diff('minute',  toDateTime('2024-06-01 10:00:00'), toDateTime('2024-06-01 10:45:00')) AS minutes_diff,
    date_diff('hour',    toDateTime('2024-06-01 00:00:00'), toDateTime('2024-06-01 18:00:00')) AS hours_diff,
    date_diff('day',     toDate('2024-01-01'),               toDate('2024-06-15'))              AS days_diff,
    date_diff('month',   toDate('2024-01-01'),               toDate('2024-06-15'))              AS months_diff,
    date_diff('year',    toDate('2020-01-01'),               toDate('2024-06-15'))              AS years_diff
```

Output:

```text
seconds_diff | minutes_diff | hours_diff | days_diff | months_diff | years_diff
330          | 45           | 18         | 166       | 5           | 4
```

## Calculating Session Duration

A common use case is measuring how long user sessions lasted:

```sql
SELECT
    session_id,
    session_start,
    session_end,
    date_diff('second', session_start, session_end) AS duration_seconds,
    date_diff('minute', session_start, session_end) AS duration_minutes
FROM sessions
WHERE session_end IS NOT NULL
ORDER BY duration_seconds DESC
LIMIT 20
```

## Age Calculation

Use `date_diff` to calculate user age or account age:

```sql
SELECT
    user_id,
    signup_date,
    today() AS today,
    date_diff('day',   signup_date, today()) AS account_age_days,
    date_diff('month', signup_date, today()) AS account_age_months,
    date_diff('year',  signup_date, today()) AS account_age_years
FROM users
```

## Time-to-Resolution Metrics

For support ticketing or incident response workflows:

```sql
SELECT
    ticket_id,
    created_at,
    resolved_at,
    date_diff('minute', created_at, resolved_at) AS resolution_minutes,
    CASE
        WHEN date_diff('hour', created_at, resolved_at) < 1  THEN 'under_1h'
        WHEN date_diff('hour', created_at, resolved_at) < 4  THEN '1h_to_4h'
        WHEN date_diff('hour', created_at, resolved_at) < 24 THEN '4h_to_24h'
        ELSE 'over_24h'
    END AS sla_bucket
FROM support_tickets
WHERE resolved_at IS NOT NULL
```

## Timezone-Aware Difference

When working with events stored in different timezones, pass the timezone as the fourth argument:

```sql
SELECT
    date_diff('day',
        toDateTime('2024-03-09 23:00:00'),
        toDateTime('2024-03-11 01:00:00'),
        'America/New_York'
    ) AS days_ny
```

This ensures daylight saving time transitions are handled correctly for day-boundary calculations.

## Using date_diff in GROUP BY

Aggregate events by elapsed time buckets:

```sql
SELECT
    date_diff('day', signup_date, first_purchase_date) AS days_to_first_purchase,
    count() AS users
FROM user_conversions
GROUP BY days_to_first_purchase
ORDER BY days_to_first_purchase
```

## Negative Differences

`date_diff` returns a negative value when `start > end`:

```sql
SELECT date_diff('day', today(), yesterday()) AS negative_diff
-- Returns: -1
```

This is useful for detecting data anomalies where end times precede start times.

## Summary

`date_diff()` in ClickHouse computes elapsed time in any unit from second to year between two date or datetime values. It supports an optional timezone parameter for DST-aware calculations and integrates naturally into aggregate queries for SLA reporting, cohort analysis, and session duration metrics.
