# How to Implement Exponential Decay Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Exponential Decay, EMA, Time Series, Analytics

Description: Learn how to implement exponential decay and exponential moving averages in ClickHouse for time-decayed scoring and trend smoothing.

---

Exponential decay gives recent data more weight than older data, making it ideal for trend smoothing, time-decayed scoring, and recency-weighted metrics. ClickHouse supports this through mathematical functions and window-based patterns.

## Exponential Decay Score

Score each event by how recently it occurred using an exponential decay formula:

```text
score = exp(-lambda * age_in_seconds)
```

```sql
SELECT
    event_id,
    event_time,
    exp(-0.0001 * dateDiff('second', event_time, now())) AS decay_score
FROM user_events
WHERE user_id = 42
ORDER BY decay_score DESC
LIMIT 20;
```

Larger `lambda` values make the score decay faster.

## Time-Decayed Popularity Score

Sum decayed scores per item to rank by recent engagement:

```sql
SELECT
    item_id,
    sum(exp(-0.00005 * dateDiff('second', event_time, now()))) AS popularity_score
FROM item_views
WHERE event_time >= now() - INTERVAL 30 DAY
GROUP BY item_id
ORDER BY popularity_score DESC
LIMIT 10;
```

## Exponential Moving Average (EMA)

ClickHouse provides a built-in `exponentialMovingAverage` aggregate function that can be used as a window function:

```sql
SELECT
    ts,
    value,
    exponentialMovingAverage(5)(value, toUnixTimestamp(ts)) OVER (ORDER BY ts) AS ema
FROM time_series
ORDER BY ts;
```

The parameter `5` controls the half-life in time units.

## Manual EMA via Recursive CTE

For precise EMA computation:

```sql
WITH RECURSIVE ema_calc AS (
    SELECT ts, value, value AS ema
    FROM time_series
    ORDER BY ts
    LIMIT 1

    UNION ALL

    SELECT t.ts, t.value, t.value * 0.1 + e.ema * 0.9 AS ema
    FROM time_series t
    JOIN ema_calc e ON t.ts = addSeconds(e.ts, 60)
)
SELECT ts, value, round(ema, 4) AS ema
FROM ema_calc
ORDER BY ts;
```

Adjust the smoothing factor (0.1) based on your desired responsiveness.

## Decayed Count for Rate Limiting or Scoring

Track a decayed event count over time:

```sql
SELECT
    user_id,
    sum(exp(-0.001 * dateDiff('second', event_time, now()))) AS decayed_event_count
FROM user_events
WHERE event_time >= now() - INTERVAL 7 DAY
GROUP BY user_id
ORDER BY decayed_event_count DESC;
```

## Summary

ClickHouse implements exponential decay through `exp()` applied to age differences. Use `exponentialMovingAverage` for EMA or manual recursive CTEs for precise control. Decay-based scoring is especially useful for recommenders, rate limiting, and recency-weighted analytics.
