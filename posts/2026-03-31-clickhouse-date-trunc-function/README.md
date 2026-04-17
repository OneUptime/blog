# How to Use date_trunc() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, SQL Standard, Time Series, Aggregation

Description: Learn how to use date_trunc() to truncate DateTime values to a given unit. A SQL-standard alternative to ClickHouse toStartOf* helpers supporting all major calendar units.

---

`date_trunc()` is the SQL-standard way to truncate a timestamp to a calendar boundary. ClickHouse implements it with the same semantics as its `toStartOf*` functions, making it straightforward to migrate queries from PostgreSQL, Redshift, or Snowflake without rewriting date logic. It accepts a string unit name and a DateTime, returning the start of the enclosing unit.

## Function Signature

```text
date_trunc(unit, value)
date_trunc(unit, value, timezone)
```

The `unit` parameter is a string constant. Supported values are: `'second'`, `'minute'`, `'hour'`, `'day'`, `'week'`, `'month'`, `'quarter'`, `'year'`. The optional `timezone` argument shifts the truncation boundary to align with local time.

## Truncating to Common Units

The examples below show truncation to each supported unit using the same source timestamp so you can compare results side by side.

```sql
SELECT
    '2026-03-31 14:23:47'::DateTime AS source,
    date_trunc('second',  source)   AS trunc_second,
    date_trunc('minute',  source)   AS trunc_minute,
    date_trunc('hour',    source)   AS trunc_hour,
    date_trunc('day',     source)   AS trunc_day,
    date_trunc('week',    source)   AS trunc_week,
    date_trunc('month',   source)   AS trunc_month,
    date_trunc('quarter', source)   AS trunc_quarter,
    date_trunc('year',    source)   AS trunc_year;
```

```text
source:        2026-03-31 14:23:47
trunc_second:  2026-03-31 14:23:47   (no-op for second)
trunc_minute:  2026-03-31 14:23:00
trunc_hour:    2026-03-31 14:00:00
trunc_day:     2026-03-31 00:00:00
trunc_week:    2026-03-30             (Monday of that week)
trunc_month:   2026-03-01
trunc_quarter: 2026-01-01
trunc_year:    2026-01-01
```

Note that `'second'`, `'minute'`, `'hour'`, and `'day'` return `DateTime`, while `'week'`, `'month'`, `'quarter'`, and `'year'` return `Date`. Week truncation follows ISO 8601 and snaps to the preceding Monday.

## Daily Aggregation

Grouping events by day is the most common use of date truncation. `date_trunc('day', ...)` produces a clean `DateTime` column that sorts and displays correctly without extra formatting.

```sql
SELECT
    date_trunc('day', event_time) AS day,
    count()                       AS events,
    uniq(user_id)                 AS unique_users
FROM page_views
WHERE event_time >= today() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day ASC;
```

## Weekly Rollups for Dashboards

Weekly aggregations are useful for trend charts. Because `date_trunc('week', ...)` always returns the Monday of the week, all rows are consistently aligned.

```sql
SELECT
    date_trunc('week', order_date) AS week_start,
    sum(amount)                    AS weekly_revenue,
    count()                        AS order_count,
    avg(amount)                    AS avg_order_value
FROM orders
WHERE order_date >= date_trunc('year', today())
GROUP BY week_start
ORDER BY week_start ASC;
```

## Monthly and Quarterly Financial Summaries

Finance teams typically want month-over-month and quarter-over-quarter comparisons. `date_trunc` makes it easy to group by billing period without generating a calendar table.

```sql
SELECT
    date_trunc('month', payment_date)   AS month,
    sum(amount)                         AS monthly_total,
    sum(sum(amount)) OVER (
        PARTITION BY date_trunc('year', payment_date)
        ORDER BY date_trunc('month', payment_date)
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                   AS ytd_total
FROM payments
WHERE payment_date >= date_trunc('year', today())
GROUP BY month
ORDER BY month ASC;
```

## Quarterly Cohort Analysis

Truncating signup dates to the quarter lets you group users into acquisition cohorts and compare their lifetime value across quarters.

```sql
SELECT
    date_trunc('quarter', signup_date) AS cohort_quarter,
    count()                            AS cohort_size,
    sum(lifetime_revenue)              AS total_ltv,
    avg(lifetime_revenue)              AS avg_ltv
FROM users
WHERE signup_date >= date_trunc('year', today()) - INTERVAL 2 YEAR
GROUP BY cohort_quarter
ORDER BY cohort_quarter ASC;
```

## Timezone-Aware Day Boundaries

Without an explicit timezone argument, `date_trunc('day', ...)` truncates using the timezone of the input value (the column's declared timezone, or the server timezone if none is set). When that resolves to UTC, an activity day for users in other regions can split across two UTC days. Pass a timezone to align to local midnight regardless of how the column is stored.

```sql
SELECT
    date_trunc('day', event_time, 'Asia/Tokyo') AS local_day,
    count()                                     AS events
FROM user_sessions
WHERE user_region = 'JP'
  AND event_time >= now() - INTERVAL 7 DAY
GROUP BY local_day
ORDER BY local_day ASC;
```

## Comparing date_trunc to toStartOf* Helpers

Both approaches produce identical results. The choice is a matter of style and source compatibility.

```sql
-- These three queries return the same rows:

SELECT date_trunc('hour', event_time) AS bucket, count() AS n
FROM logs GROUP BY bucket;

SELECT toStartOfHour(event_time) AS bucket, count() AS n
FROM logs GROUP BY bucket;

SELECT toStartOfInterval(event_time, INTERVAL 1 HOUR) AS bucket, count() AS n
FROM logs GROUP BY bucket;
```

`date_trunc` is the best choice when porting queries from other SQL databases. `toStartOf*` and `toStartOfInterval()` are idiomatic ClickHouse and slightly more explicit about the target unit.

## Summary

`date_trunc()` brings standard SQL date truncation to ClickHouse, accepting a string unit from `'second'` through `'year'`. It is drop-in compatible with PostgreSQL syntax, respects ISO week boundaries, and supports timezone-aware truncation. Use it for daily, weekly, monthly, and quarterly aggregations in analytics queries, and when migrating SQL from other relational databases.
