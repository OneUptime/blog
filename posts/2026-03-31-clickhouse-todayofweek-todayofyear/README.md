# How to Use toDayOfWeek() and toDayOfYear() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Analytics, Aggregation, Query

Description: Learn how to use toDayOfWeek() and toDayOfYear() in ClickHouse for weekday analysis, day-of-year trends, and day-based GROUP BY queries.

---

Two frequently needed date-component functions in ClickHouse are `toDayOfWeek()` and `toDayOfYear()`. The first tells you which day of the week a date falls on, which is indispensable for weekend-vs-weekday analysis. The second counts how many days have elapsed since January 1st of the same year, making it useful for comparing seasonal trends across years.

This post explains the return values and mode options for both functions and shows practical SQL patterns for each.

## toDayOfWeek() - Day of the Week

`toDayOfWeek(dt, mode)` returns a `UInt8` representing the day of the week. The `mode` argument controls which day is considered the first day of the week and whether the range starts at 0 or 1.

The two most common modes are:

```text
Mode 0 (default): Monday = 1, ..., Sunday = 7
Mode 1:           Monday = 0, ..., Sunday = 6
```

When called with no mode argument, mode 0 is used:

```sql
SELECT
    toDate('2026-03-30') AS date,   -- Monday
    toDayOfWeek(toDate('2026-03-30')) AS dow_mode1,

    toDate('2026-03-29') AS sunday,
    toDayOfWeek(toDate('2026-03-29')) AS sunday_mode1;
```

```text
date         dow_mode1   sunday       sunday_mode1
------------ ----------- ------------ ------------
2026-03-30   1           2026-03-29   7
```

## Weekday vs. Weekend Analysis

The most common use of `toDayOfWeek()` is separating weekday and weekend traffic. With mode 1, values 1-5 are weekdays and 6-7 are weekends:

```sql
SELECT
    if(toDayOfWeek(event_date) IN (6, 7), 'Weekend', 'Weekday') AS day_type,
    count()           AS events,
    sum(revenue)      AS total_revenue,
    avg(response_ms)  AS avg_response_ms
FROM events
WHERE event_date >= today() - 90
GROUP BY day_type
ORDER BY day_type;
```

## Aggregating by Day of Week

Collapse all data across multiple weeks and measure average load per day of the week to reveal weekly rhythms:

```sql
SELECT
    toDayOfWeek(created_at)  AS dow,
    CASE toDayOfWeek(created_at)
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
        WHEN 7 THEN 'Sunday'
    END                      AS day_name,
    count()                  AS requests,
    avg(response_ms)         AS avg_response_ms
FROM http_logs
WHERE created_at >= now() - INTERVAL 90 DAY
GROUP BY dow, day_name
ORDER BY dow;
```

## Filtering for Specific Days

To return only Monday records, filter on `toDayOfWeek(dt) = 1`:

```sql
-- Performance on Mondays only
SELECT
    toDate(created_at)  AS date,
    count()             AS requests,
    avg(response_ms)    AS avg_response_ms
FROM http_logs
WHERE toDayOfWeek(created_at) = 1
  AND created_at >= now() - INTERVAL 90 DAY
GROUP BY date
ORDER BY date;
```

## toDayOfYear() - Day of the Year

`toDayOfYear(dt)` returns a `UInt16` in the range 1 to 366 representing the ordinal day within the year. January 1st is always 1; December 31st is 365 (or 366 in a leap year).

```sql
SELECT
    toDate('2026-01-01') AS jan_1,
    toDayOfYear(toDate('2026-01-01')) AS doy_jan_1,

    toDate('2026-03-31') AS mar_31,
    toDayOfYear(toDate('2026-03-31')) AS doy_mar_31;
```

```text
jan_1        doy_jan_1   mar_31       doy_mar_31
------------ ----------- ------------ ----------
2026-01-01   1           2026-03-31   90
```

## Comparing Day-of-Year Trends Across Years

Because the ordinal day is independent of the year, you can overlay multiple years on the same axis. This is useful for detecting whether this year's revenue is tracking ahead of or behind last year at the same point in the calendar:

```sql
SELECT
    toDayOfYear(sale_date)  AS day_of_year,
    toYear(sale_date)       AS year,
    sum(revenue)            AS revenue
FROM sales
WHERE toYear(sale_date) IN (2024, 2025, 2026)
GROUP BY day_of_year, year
ORDER BY day_of_year, year;
```

## Finding "This Date Last Year"

Combine `toDayOfYear()` with year filtering to find the equivalent day in a prior year:

```sql
SELECT
    toYear(sale_date)      AS year,
    sum(revenue)           AS revenue
FROM sales
WHERE toDayOfYear(sale_date) = toDayOfYear(today())
GROUP BY year
ORDER BY year;
```

## Days Remaining in the Year

Use `toDayOfYear()` to compute how many days remain in the current year:

```sql
SELECT
    toDayOfYear(today())                                     AS day_of_year,
    toDayOfYear(toDate(concat(toString(toYear(today())), '-12-31'))) AS days_in_year,
    toDayOfYear(toDate(concat(toString(toYear(today())), '-12-31')))
        - toDayOfYear(today())                               AS days_remaining
```

## Combined Day-of-Week and Day-of-Year Report

For a comprehensive periodic report, combine both functions:

```sql
SELECT
    toDayOfYear(event_date)  AS day_of_year,
    toDayOfWeek(event_date)  AS day_of_week,
    event_date,
    count()                  AS events
FROM user_events
WHERE toYear(event_date) = 2026
GROUP BY day_of_year, day_of_week, event_date
ORDER BY day_of_year;
```

## Summary

`toDayOfWeek()` and `toDayOfYear()` are complementary date-component functions that unlock two important analytical dimensions. Use `toDayOfWeek()` for weekly pattern detection, weekday/weekend segmentation, and day-of-week GROUP BY queries. Use `toDayOfYear()` for cross-year comparisons, seasonal trend overlays, and ordinal-day calculations. Together they cover the most common day-level analysis needs in ClickHouse.
