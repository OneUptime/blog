# How to Build Date-Based Reports in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Report, Time Series, Analytics, toStartOfMonth

Description: Learn how to build date-based reports in ClickHouse using date truncation functions, time series gap-filling, and period comparisons.

---

## Why Date-Based Reports Matter

Date-based reports aggregate metrics over time periods - daily active users, monthly revenue, weekly signups. ClickHouse provides a rich set of date functions that make building these reports fast and expressive.

## Sample Events Table

```sql
CREATE TABLE events
(
    event_time DateTime,
    user_id UInt64,
    revenue Float64
)
ENGINE = MergeTree()
ORDER BY event_time;
```

## Daily Aggregation

Use `toDate` or `toStartOfDay` to group by calendar day:

```sql
SELECT
    toDate(event_time) AS day,
    count() AS events,
    uniq(user_id) AS unique_users,
    sum(revenue) AS total_revenue
FROM events
WHERE event_time >= today() - 30
GROUP BY day
ORDER BY day;
```

## Weekly and Monthly Reports

```sql
-- Weekly
SELECT
    toStartOfWeek(event_time) AS week,
    count() AS events,
    sum(revenue) AS revenue
FROM events
GROUP BY week
ORDER BY week;

-- Monthly
SELECT
    toStartOfMonth(event_time) AS month,
    count() AS events,
    sum(revenue) AS revenue
FROM events
GROUP BY month
ORDER BY month;
```

## Filling Gaps in Time Series

When some days have no events, use `WITH FILL` to include them:

```sql
SELECT
    toDate(event_time) AS day,
    count() AS events
FROM events
WHERE event_time >= today() - 14
GROUP BY day
ORDER BY day WITH FILL FROM today() - 14 TO today() STEP 1;
```

## Hour-of-Day Distribution

Understand traffic patterns by hour:

```sql
SELECT
    toHour(event_time) AS hour,
    count() AS events,
    avg(revenue) AS avg_revenue
FROM events
WHERE event_time >= today() - 7
GROUP BY hour
ORDER BY hour;
```

## Cohort Date Grouping

Group users by their signup date and track weekly retention:

```sql
SELECT
    toStartOfWeek(signup_date) AS cohort_week,
    toStartOfWeek(event_time) AS activity_week,
    uniq(user_id) AS active_users
FROM events
JOIN (SELECT user_id, min(event_time) AS signup_date FROM events GROUP BY user_id) USING user_id
GROUP BY cohort_week, activity_week
ORDER BY cohort_week, activity_week;
```

## Last N Days Rolling Window

```sql
SELECT
    day,
    sum(daily_revenue) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7d_revenue
FROM (
    SELECT
        toDate(event_time) AS day,
        sum(revenue) AS daily_revenue
    FROM events
    WHERE event_time >= today() - 60
    GROUP BY day
)
ORDER BY day;
```

## Summary

ClickHouse's date functions - `toDate`, `toStartOfWeek`, `toStartOfMonth`, `toHour` - combined with `WITH FILL` for gap handling make it straightforward to build comprehensive date-based reports. Rolling windows via `OVER` clauses add moving average and cumulative calculations.
