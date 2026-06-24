# How to Use now() and today() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Time Function, Query, Analytics

Description: Learn how to use now(), today(), now64(), yesterday(), and tomorrow() in ClickHouse to filter recent data and compute elapsed time.

---

ClickHouse provides a set of built-in functions that return the current date and time at query execution. These functions are essential for filtering recent records, computing elapsed durations, and building time-aware dashboards without hardcoding timestamps into your queries.

This post covers `now()`, `today()`, `now64()`, and `yesterday()` - what each one returns, when to use it, and practical SQL examples for each.

## now() - Current DateTime

`now()` returns the current date and time as a `DateTime` value (second-level precision) in the server's local timezone. It is evaluated once per query, so every row in a result set sees the same value.

```sql
SELECT now() AS current_datetime;
```

```text
current_datetime
-------------------
2026-03-31 14:22:05
```

Use `now()` to filter rows that fall within a recent window. The following query retrieves all HTTP requests logged in the past hour:

```sql
SELECT
    request_id,
    url,
    status_code,
    created_at
FROM http_logs
WHERE created_at >= now() - INTERVAL 1 HOUR
ORDER BY created_at DESC;
```

To look back further, adjust the interval unit:

```sql
-- Last 24 hours
SELECT count() FROM events WHERE created_at >= now() - INTERVAL 24 HOUR;

-- Last 7 days
SELECT count() FROM events WHERE created_at >= now() - INTERVAL 7 DAY;

-- Last 30 days
SELECT count() FROM events WHERE created_at >= now() - INTERVAL 30 DAY;
```

## today() - Current Date

`today()` returns the current date as a `Date` value (no time component). It is equivalent to `toDate(now())` but more readable.

```sql
SELECT today() AS current_date;
```

```text
current_date
------------
2026-03-31
```

Use `today()` when working with `Date` columns or when you want to match entire calendar days rather than a sliding time window:

```sql
-- All orders placed today
SELECT order_id, customer_id, total
FROM orders
WHERE order_date = today();

-- Orders from today and yesterday
SELECT order_date, count() AS total_orders
FROM orders
WHERE order_date IN (today(), yesterday())
GROUP BY order_date
ORDER BY order_date;
```

## now64() - Sub-Second Precision

`now64()` returns the current date and time as a `DateTime64` value with configurable sub-second precision. The default scale is 3 (milliseconds), but you can specify 0 through 9.

```sql
-- Millisecond precision (default scale = 3)
SELECT now64() AS ts_ms;

-- Microsecond precision (scale = 6)
SELECT now64(6) AS ts_us;

-- Nanosecond precision (scale = 9)
SELECT now64(9) AS ts_ns;
```

`now64()` is useful when your event timestamps are stored as `DateTime64` and you need to compare them accurately:

```sql
SELECT
    trace_id,
    span_name,
    start_time,
    end_time,
    toFloat64(now64(6) - start_time) AS age_seconds
FROM spans
WHERE start_time >= now64(6) - INTERVAL 5 MINUTE
ORDER BY start_time DESC;
```

## yesterday() and Date Arithmetic

`yesterday()` returns `today() - 1` as a `Date` value and is a convenience shortcut. ClickHouse does not have a built-in `tomorrow()` function, but you can use `today() + 1` to get tomorrow's date.

```sql
SELECT
    yesterday()   AS yesterday,
    today()       AS today,
    today() + 1   AS tomorrow;
```

```text
yesterday    today        tomorrow
------------ ------------ ------------
2026-03-30   2026-03-31   2026-04-01
```

A common use case is building a daily comparison report:

```sql
SELECT
    multiIf(
        event_date = today(),     'Today',
        event_date = yesterday(), 'Yesterday',
        'Older'
    ) AS period,
    count()       AS events,
    sum(revenue)  AS total_revenue
FROM daily_sales
WHERE event_date >= yesterday()
GROUP BY period
ORDER BY period;
```

## Computing Elapsed Time Since now()

Subtract a stored timestamp from `now()` to get elapsed seconds as an integer, or use `dateDiff` for a named unit:

```sql
-- Elapsed seconds (integer arithmetic on DateTime)
SELECT
    incident_id,
    opened_at,
    now() - opened_at AS elapsed_seconds
FROM incidents
WHERE resolved_at = '1970-01-01 00:00:00'  -- still open
ORDER BY elapsed_seconds DESC;
```

```sql
-- Elapsed time expressed in multiple units using dateDiff
SELECT
    incident_id,
    opened_at,
    dateDiff('hour',   opened_at, now()) AS hours_open,
    dateDiff('minute', opened_at, now()) AS minutes_open
FROM incidents
WHERE resolved_at = '1970-01-01 00:00:00'
ORDER BY hours_open DESC;
```

## Filtering for Data in a Specific Future Window

`now()` and date arithmetic are equally useful for upcoming data:

```sql
-- Scheduled jobs running in the next 2 hours
SELECT job_name, scheduled_at
FROM scheduled_jobs
WHERE scheduled_at BETWEEN now() AND now() + INTERVAL 2 HOUR
ORDER BY scheduled_at;
```

## Summary

`now()` and `today()` are the foundation of time-aware queries in ClickHouse. Use `now()` for sliding windows against `DateTime` columns, `today()` for calendar-day matching against `Date` columns, and `now64()` when you need millisecond or microsecond precision with `DateTime64` data. `yesterday()` and simple date arithmetic like `today() + 1` reduce verbosity in day-boundary comparisons. Together, these functions make it straightforward to filter recent data and compute elapsed durations without ever hardcoding a timestamp.
