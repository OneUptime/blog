# How to Build Data Anomaly Detection Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Anomaly Detection, Statistical Query, Z-Score, Moving Average, Data Quality

Description: Build statistical anomaly detection queries in ClickHouse using z-scores, moving averages, and IQR-based outlier detection for time-series data monitoring.

---

## Why Detect Anomalies in ClickHouse?

ClickHouse's analytical engine makes it well-suited for statistical anomaly detection at scale. Rather than exporting data to a separate system, you can run anomaly queries directly on billions of rows - detecting unusual spikes, drops, or distribution shifts in your metrics.

## Method 1 - Z-Score Anomaly Detection

Compare each time bucket's value against the mean and standard deviation over a trailing window:

```sql
WITH stats AS (
    SELECT
        avg(event_count)    AS mean_count,
        stddevPop(event_count) AS std_count
    FROM (
        SELECT
            toStartOfHour(ts) AS hour,
            count()           AS event_count
        FROM events
        WHERE ts >= now() - INTERVAL 7 DAY
        GROUP BY hour
    )
)
SELECT
    hour,
    event_count,
    (event_count - stats.mean_count) / NULLIF(stats.std_count, 0) AS z_score
FROM (
    SELECT toStartOfHour(ts) AS hour, count() AS event_count
    FROM events
    WHERE ts >= now() - INTERVAL 7 DAY
    GROUP BY hour
) t
CROSS JOIN stats
WHERE abs(z_score) > 3
ORDER BY abs(z_score) DESC;
```

Z-scores above 3 indicate anomalies more than 3 standard deviations from the mean.

## Method 2 - Moving Average Threshold

Detect values that deviate significantly from a rolling average:

```sql
SELECT
    hour,
    event_count,
    avg(event_count) OVER (
        ORDER BY hour
        ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
    ) AS rolling_avg_24h,
    event_count / NULLIF(avg(event_count) OVER (
        ORDER BY hour
        ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
    ), 0) AS ratio
FROM (
    SELECT toStartOfHour(ts) AS hour, count() AS event_count
    FROM events
    WHERE ts >= now() - INTERVAL 3 DAY
    GROUP BY hour
    ORDER BY hour
)
QUALIFY ratio > 2 OR ratio < 0.5;
```

Events more than 2x or less than 0.5x the 24-hour rolling average are flagged.

## Method 3 - IQR-Based Outlier Detection

Interquartile range (IQR) is more robust than z-score for skewed distributions:

```sql
SELECT
    hour,
    event_count
FROM (
    SELECT toStartOfHour(ts) AS hour, count() AS event_count
    FROM events
    WHERE ts >= now() - INTERVAL 1 DAY
    GROUP BY hour
)
QUALIFY event_count < quantile(0.25)(event_count) OVER ()
                   - 1.5 * (quantile(0.75)(event_count) OVER ()
                           - quantile(0.25)(event_count) OVER ())
     OR event_count > quantile(0.75)(event_count) OVER ()
                   + 1.5 * (quantile(0.75)(event_count) OVER ()
                           - quantile(0.25)(event_count) OVER ());
```

## Method 4 - Sudden Drop Detection

Detect when metric values drop suddenly compared to the previous period:

```sql
SELECT
    hour,
    event_count,
    lagInFrame(event_count) OVER (ORDER BY hour) AS prev_count,
    event_count - lagInFrame(event_count) OVER (ORDER BY hour) AS delta
FROM (
    SELECT toStartOfHour(ts) AS hour, count() AS event_count
    FROM events
    WHERE ts >= now() - INTERVAL 12 HOUR
    GROUP BY hour
    ORDER BY hour
)
QUALIFY delta < -1000;  -- dropped by more than 1000 events/hour
```

## Storing Anomaly Results

Write anomalies to a monitoring table:

```sql
INSERT INTO anomaly_log
SELECT
    now()          AS detected_at,
    hour,
    event_count,
    z_score,
    'z_score > 3'  AS detection_method
FROM anomaly_query_results;
```

## Summary

Build ClickHouse anomaly detection queries using z-scores for normally distributed metrics, rolling average ratios for trend-based detection, IQR for skewed distributions, and lag functions for sudden drop detection. Store results in an anomaly log table and integrate with alerting to notify on significant deviations.
