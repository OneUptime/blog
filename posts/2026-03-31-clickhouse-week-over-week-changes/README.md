# How to Calculate Week-Over-Week Changes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, Week-Over-Week, Analytics, Time Series

Description: Learn how to calculate week-over-week changes in ClickHouse using window functions and self-joins to track growth and trends over time.

---

Week-over-week (WoW) comparisons reveal growth trends by comparing a metric in the current week to the same metric in the prior week. ClickHouse supports this through window functions and self-joins.

## Using Window Functions

The `lagInFrame` window function lets you access the value from a previous row within the window frame.

```sql
SELECT
    toStartOfWeek(event_date) AS week,
    sum(revenue) AS current_revenue,
    lagInFrame(sum(revenue)) OVER (ORDER BY toStartOfWeek(event_date)) AS prev_revenue,
    round(
        (sum(revenue) - lagInFrame(sum(revenue)) OVER (ORDER BY toStartOfWeek(event_date)))
        / lagInFrame(sum(revenue)) OVER (ORDER BY toStartOfWeek(event_date)) * 100,
        2
    ) AS wow_pct
FROM orders
GROUP BY week
ORDER BY week;
```

## Using a Self-Join

For more control, join the table against itself with a 7-day offset:

```sql
SELECT
    a.week,
    a.revenue AS current_revenue,
    b.revenue AS prev_revenue,
    round((a.revenue - b.revenue) / b.revenue * 100, 2) AS wow_pct
FROM (
    SELECT toStartOfWeek(event_date) AS week, sum(revenue) AS revenue
    FROM orders GROUP BY week
) a
LEFT JOIN (
    SELECT toStartOfWeek(event_date) AS week, sum(revenue) AS revenue
    FROM orders GROUP BY week
) b ON a.week = addWeeks(b.week, 1)
ORDER BY a.week;
```

## Filtering for a Specific Time Range

To limit output to the last 12 weeks:

```sql
WITH
    toStartOfWeek(today()) AS this_week,
    addWeeks(this_week, -12) AS cutoff
SELECT *
FROM wow_results
WHERE week >= cutoff
ORDER BY week;
```

## Handling Missing Weeks

If some weeks have no data, the lag approach returns null. Handle with `ifNull`:

```sql
ifNull(lagInFrame(sum(revenue)) OVER (...), 0) AS prev_revenue
```

## Per-Segment WoW

Partition by a dimension to compute WoW per product category:

```sql
SELECT
    category,
    week,
    sum(revenue) AS revenue,
    lagInFrame(sum(revenue)) OVER (PARTITION BY category ORDER BY week) AS prev_revenue
FROM orders
GROUP BY category, week
ORDER BY category, week;
```

## Summary

ClickHouse calculates week-over-week changes efficiently using `lagInFrame` window functions or self-joins on weekly aggregates. Use `PARTITION BY` for per-segment analysis and `ifNull` to handle gaps in the time series.
