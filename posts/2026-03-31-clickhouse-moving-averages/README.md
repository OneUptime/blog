# How to Calculate Moving Averages in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Moving Average, Window Function, Time-Series, Analytics

Description: Learn how to calculate simple and exponential moving averages in ClickHouse using window functions and the avg() aggregation over time windows.

---

## Moving Averages in Time-Series Analytics

Moving averages smooth out noisy time-series data to reveal trends. ClickHouse provides window functions, `arrayAvg`, and time-bucketed aggregations to compute them efficiently.

## Simple Moving Average with Window Functions

Calculate a 7-day simple moving average (SMA) using a sliding window:

```sql
SELECT
    day,
    revenue,
    avg(revenue) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS sma_7d
FROM (
    SELECT
        toDate(event_time) AS day,
        sum(revenue) AS revenue
    FROM sales
    WHERE event_time >= today() - 30
    GROUP BY day
)
ORDER BY day;
```

## Weighted Moving Average

Give more weight to recent values:

```sql
SELECT
    day,
    revenue,
    (
        revenue * 7 +
        lag(revenue, 1) OVER (ORDER BY day) * 6 +
        lag(revenue, 2) OVER (ORDER BY day) * 5 +
        lag(revenue, 3) OVER (ORDER BY day) * 4
    ) / 22 AS wma_4d
FROM (
    SELECT toDate(event_time) AS day, sum(revenue) AS revenue
    FROM sales GROUP BY day
)
ORDER BY day;
```

## Moving Average with Array Functions

Compute a moving average over a pre-aggregated array using `arrayAvg`:

```sql
WITH daily AS (
    SELECT
        toDate(event_time) AS day,
        sum(revenue) AS revenue
    FROM sales
    WHERE event_time >= today() - 60
    GROUP BY day
    ORDER BY day
)
SELECT
    day,
    revenue,
    arrayAvg(
        arraySlice(
            groupArray(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
            1
        )
    ) AS sma_7d
FROM daily;
```

## Exponential Moving Average

Use `runningAccumulate` to implement an EMA:

```sql
SELECT
    day,
    revenue,
    runningAccumulate(state) AS ema
FROM (
    SELECT
        day,
        revenue,
        initializeAggregation('exponentialMovingAverage(0.2)', revenue, toUInt32(day)) AS state
    FROM (
        SELECT toDate(event_time) AS day, sum(revenue) AS revenue
        FROM sales GROUP BY day ORDER BY day
    )
);
```

## Comparing Periods

Overlay the current and previous period's moving averages:

```sql
SELECT
    day,
    avg(revenue) OVER w AS sma_current,
    avg(prev_revenue) OVER w AS sma_previous
FROM (
    SELECT
        day,
        revenue,
        lagInFrame(revenue, 365, 0) OVER (ORDER BY day) AS prev_revenue
    FROM (
        SELECT toDate(event_time) AS day, sum(revenue) AS revenue
        FROM sales GROUP BY day
    )
)
WINDOW w AS (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
ORDER BY day;
```

## Summary

ClickHouse calculates moving averages using window functions with `ROWS BETWEEN` frames, array aggregations with `arrayAvg`, and the `runningAccumulate` function for exponential moving averages. Combine them with pre-aggregated daily rollups for efficient large-scale time-series smoothing.
