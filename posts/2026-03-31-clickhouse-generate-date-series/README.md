# How to Generate Date Series in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Series, generateDateRange, Number, Gap Fill

Description: Learn how to generate continuous date series in ClickHouse using generateDateRange, numbers(), and WITH FILL to create gap-free time axes for reports.

---

## Why Generate Date Series?

When joining time series data with a date range, missing days produce gaps in your report. Generating a complete date series and LEFT JOINing your data ensures every day appears even when there are no events.

## Using numbers() to Generate a Date Range

Available on all ClickHouse versions:

```sql
SELECT today() - number AS day
FROM numbers(30)
ORDER BY day;
```

Monthly series:

```sql
SELECT toStartOfMonth(today() - INTERVAL number MONTH) AS month
FROM numbers(12)
ORDER BY month;
```

## Joining a Date Series with Metrics

Fill gaps in daily revenue data:

```sql
WITH date_series AS (
    SELECT today() - number AS day
    FROM numbers(30)
    ORDER BY day
)
SELECT
    d.day,
    coalesce(r.revenue, 0) AS revenue,
    coalesce(r.orders, 0) AS orders
FROM date_series d
LEFT JOIN (
    SELECT
        toDate(order_time) AS day,
        sum(amount) AS revenue,
        count() AS orders
    FROM orders
    WHERE order_time >= today() - 30
    GROUP BY day
) r ON d.day = r.day
ORDER BY d.day;
```

## Using WITH FILL for Automatic Gap Filling

`WITH FILL` automatically inserts missing rows in ORDER BY results:

```sql
SELECT
    toDate(event_time) AS day,
    count() AS events
FROM events
WHERE event_time >= today() - 14
GROUP BY day
ORDER BY day WITH FILL FROM today() - 14 TO today() + 1 STEP 1;
```

Fill with a default value using `INTERPOLATE`:

```sql
SELECT
    day,
    events
FROM (
    SELECT toDate(event_time) AS day, count() AS events
    FROM events
    GROUP BY day
)
ORDER BY day WITH FILL FROM today() - 7 TO today() STEP 1
INTERPOLATE (events AS 0);
```

## Hourly Time Series with WITH FILL

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS events
FROM events
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour WITH FILL
    FROM toStartOfHour(now() - INTERVAL 24 HOUR)
    TO toStartOfHour(now())
    STEP toIntervalHour(1);
```

## Summary

ClickHouse generates date series via `numbers()` with date arithmetic or `WITH FILL` on ORDER BY. Use `WITH FILL` for automatic gap filling directly in query results, and LEFT JOIN a `numbers()`-based series when combining with aggregated metric data.
