# How to Implement Z-Score Anomaly Detection in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Z-Score, Anomaly Detection, Statistics, Analytics

Description: Learn how to implement Z-score based anomaly detection in ClickHouse to identify statistical outliers in metrics, logs, and time-series data.

---

Z-score anomaly detection flags data points that deviate significantly from the mean in terms of standard deviations. It is simple, fast, and works well for normally distributed metrics.

## Computing Z-Score

```sql
SELECT
    event_time,
    response_ms,
    avg(response_ms) OVER () AS mean,
    stddevPop(response_ms) OVER () AS stddev,
    (response_ms - avg(response_ms) OVER ()) / stddevPop(response_ms) OVER () AS z_score
FROM http_requests
ORDER BY abs(z_score) DESC
LIMIT 20;
```

Points with `abs(z_score) > 3` are typically flagged as anomalies.

## Rolling Z-Score for Time Series

Compute z-score against a sliding historical window rather than the entire dataset:

```sql
SELECT
    ts,
    value,
    avg(value) OVER (ORDER BY ts ROWS BETWEEN 59 PRECEDING AND CURRENT ROW) AS rolling_mean,
    stddevPop(value) OVER (ORDER BY ts ROWS BETWEEN 59 PRECEDING AND CURRENT ROW) AS rolling_std,
    (value - avg(value) OVER (ORDER BY ts ROWS BETWEEN 59 PRECEDING AND CURRENT ROW))
        / nullIf(stddevPop(value) OVER (ORDER BY ts ROWS BETWEEN 59 PRECEDING AND CURRENT ROW), 0)
        AS z_score
FROM metrics
WHERE sensor_id = 'cpu_host01'
ORDER BY ts;
```

## Flagging Anomalies

Wrap the z-score query to identify outliers:

```sql
WITH scored AS (
    SELECT
        event_time,
        metric_value,
        (metric_value - avg(metric_value) OVER ()) / nullIf(stddevPop(metric_value) OVER (), 0) AS z
    FROM daily_metrics
)
SELECT event_time, metric_value, z
FROM scored
WHERE abs(z) > 3
ORDER BY event_time;
```

## Per-Group Z-Score

Detect anomalies within each region or service independently:

```sql
SELECT
    service,
    event_time,
    error_rate,
    (error_rate - avg(error_rate) OVER (PARTITION BY service))
        / nullIf(stddevPop(error_rate) OVER (PARTITION BY service), 0) AS z_score
FROM service_metrics
ORDER BY abs(z_score) DESC;
```

## Limitations and Alternatives

Z-score assumes a roughly normal distribution. For heavy-tailed or skewed data, consider modified Z-score using the median and MAD (median absolute deviation):

```sql
WITH medians AS (
    SELECT value, median(value) OVER () AS med
    FROM metrics
),
deviations AS (
    SELECT value, med, median(abs(value - med)) OVER () AS mad
    FROM medians
)
SELECT value, 0.6745 * (value - med) / nullIf(mad, 0) AS modified_z
FROM deviations;
```

## Summary

ClickHouse implements Z-score anomaly detection using `avg` and `stddevPop` window functions. Use rolling windows for time-aware anomaly detection, partition by service or entity for per-group scoring, and apply modified Z-score for non-normal distributions.
