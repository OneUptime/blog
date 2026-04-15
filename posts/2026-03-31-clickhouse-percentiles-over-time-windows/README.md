# How to Calculate Percentiles Over Time Windows in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Percentile, Quantile, Window Function, Time-Series

Description: Learn how to compute P50, P95, and P99 percentiles over sliding time windows in ClickHouse using quantile functions and window aggregations.

---

## Why Percentiles Over Time

Averages hide latency tail behavior. P95 and P99 latency tell you what your slowest users experience. Computing percentiles over rolling windows reveals how tail latency trends over time, which is critical for SLO monitoring.

## Simple Percentile Queries

Calculate common percentiles for a time range:

```sql
SELECT
    quantile(0.50)(latency_ms) AS p50,
    quantile(0.90)(latency_ms) AS p90,
    quantile(0.95)(latency_ms) AS p95,
    quantile(0.99)(latency_ms) AS p99
FROM requests
WHERE event_time >= now() - INTERVAL 1 HOUR;
```

## Percentiles by Time Bucket

Break percentiles into 5-minute buckets to show trends:

```sql
SELECT
    toStartOfFiveMinutes(event_time) AS bucket,
    quantile(0.50)(latency_ms) AS p50,
    quantile(0.95)(latency_ms) AS p95,
    quantile(0.99)(latency_ms) AS p99,
    count() AS request_count
FROM requests
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY bucket
ORDER BY bucket;
```

## Multiple Percentiles Efficiently

Use `quantiles()` to compute multiple percentiles in a single pass:

```sql
SELECT
    service,
    quantiles(0.50, 0.90, 0.95, 0.99)(latency_ms) AS latency_percentiles
FROM requests
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY service;
```

Access individual values with array indexing: `latency_percentiles[1]` for P50, `latency_percentiles[4]` for P99.

## Sliding Window Percentile

Compute a rolling P99 over the past hour for each 5-minute bucket:

```sql
SELECT
    bucket,
    quantileExact(0.99)(arrayJoin(window_latencies)) AS rolling_p99
FROM (
    SELECT
        bucket,
        arrayFlatten(groupArray(bucket_latencies) OVER (
            ORDER BY bucket
            ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
        )) AS window_latencies
    FROM (
        SELECT
            toStartOfFiveMinutes(event_time) AS bucket,
            groupArray(latency_ms) AS bucket_latencies
        FROM requests
        WHERE event_time >= now() - INTERVAL 2 HOUR
        GROUP BY bucket
    )
)
GROUP BY bucket
ORDER BY bucket;
```

The innermost query aggregates latency values into arrays per 5-minute bucket. The window function then collects those arrays over a sliding window of 12 buckets (one hour), and `arrayFlatten` merges them into a single array. The outer query expands each array with `arrayJoin` and computes the P99.

## Approximate vs. Exact Percentiles

For large datasets use `quantile` (reservoir sampling approximation), for precise values use `quantileExact`:

```sql
-- Approximate (faster, good for billions of rows)
SELECT quantile(0.99)(latency_ms) FROM requests;

-- Exact (slower, accurate for smaller datasets)
SELECT quantileExact(0.99)(latency_ms) FROM requests;
```

## SLO Monitoring Query

Calculate the percentage of requests meeting an SLO threshold:

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    countIf(latency_ms < 200) / count() * 100 AS slo_pct,
    quantile(0.99)(latency_ms) AS p99
FROM requests
WHERE event_time >= today()
GROUP BY hour
ORDER BY hour;
```

## Summary

ClickHouse computes percentiles with the `quantile` family of functions. Use `quantiles()` for multiple percentiles in one scan, `quantileExact` when precision matters, and time-bucketed grouping to show how percentiles change over time. These patterns are the foundation of SLO and latency trend analysis.
