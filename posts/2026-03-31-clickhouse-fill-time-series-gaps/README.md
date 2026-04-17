# How to Fill Gaps in Time-Series Data with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Time-Series, Gap Filling, WITH FILL, Analytics

Description: Learn how to fill missing time intervals in ClickHouse time-series queries using WITH FILL, number series generation, and last-value-carried-forward techniques.

---

## The Gap Problem

Time-series data often has missing intervals. If no events occurred for a minute, the query returns no row for that minute. Charts display these as gaps or incorrect interpolations. ClickHouse provides the `WITH FILL` modifier to generate continuous time sequences.

## WITH FILL for Time Series

Use `WITH FILL` in the `ORDER BY` clause to fill missing time buckets with zeros:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS events
FROM system_logs
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute WITH FILL
    FROM toStartOfMinute(now() - INTERVAL 1 HOUR)
    TO toStartOfMinute(now())
    STEP INTERVAL 1 MINUTE;
```

Missing minutes get `events = 0`.

## Filling with a Default Value

`WITH FILL` fills numeric columns with 0 by default. To fill with the last known value (carry-forward), use the `INTERPOLATE` clause:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS events
FROM system_logs
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute WITH FILL
    FROM toStartOfMinute(now() - INTERVAL 1 HOUR)
    TO toStartOfMinute(now())
    STEP INTERVAL 1 MINUTE
INTERPOLATE (events AS events);
```

Each generated row evaluates the `INTERPOLATE` expression against the previous row, so `events AS events` repeats the last known value.

## Generating a Time Spine

For maximum control, generate a complete time series and left join your data onto it:

```sql
WITH spine AS (
    SELECT
        toDateTime('2026-03-31 00:00:00') + INTERVAL number MINUTE AS minute
    FROM numbers(1440)
)
SELECT
    s.minute,
    coalesce(e.events, 0) AS events
FROM spine s
LEFT JOIN (
    SELECT toStartOfMinute(event_time) AS minute, count() AS events
    FROM system_logs
    WHERE toDate(event_time) = '2026-03-31'
    GROUP BY minute
) e ON s.minute = e.minute
ORDER BY s.minute;
```

## Daily Gap Filling

Fill missing days in a weekly report:

```sql
SELECT
    toDate(event_time) AS day,
    sum(revenue) AS revenue
FROM sales
WHERE event_time >= today() - 30
GROUP BY day
ORDER BY day WITH FILL
    FROM today() - 30
    TO today()
    STEP INTERVAL 1 DAY;
```

## Multiple Metrics with Fill

Fill gaps across multiple grouped series:

```sql
SELECT
    service,
    toStartOfMinute(ts) AS minute,
    avg(latency_ms) AS avg_latency
FROM metrics
WHERE ts >= now() - INTERVAL 2 HOUR
GROUP BY service, minute
ORDER BY service, minute WITH FILL
    FROM toStartOfMinute(now() - INTERVAL 2 HOUR)
    TO toStartOfMinute(now())
    STEP INTERVAL 1 MINUTE;
```

## Summary

ClickHouse fills time-series gaps using the `WITH FILL` modifier in `ORDER BY` clauses, number series joins for full time spines, and the `INTERPOLATE` clause for last-value-carried-forward behavior. These patterns ensure charts and aggregations correctly represent periods with no activity rather than skipping them silently.
