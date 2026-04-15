# How to Use quantileTiming() in ClickHouse for Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, quantileTiming, Latency, Performance

Description: Learn how quantileTiming() computes fast approximate percentiles optimized for response time data in the 0-30000ms range in ClickHouse.

---

ClickHouse's `quantileTiming()` function is purpose-built for response time and latency data. It uses a fixed-size data structure optimized for values in the 0 to 30,000 millisecond range, making it extremely fast and memory-efficient for web service latency analysis. If your values fall outside this range or you need general-purpose quantiles, other functions like `quantile()` or `quantileTDigest()` are more appropriate.

## Basic Syntax

```sql
-- Compute 95th percentile of response time
SELECT quantileTiming(0.95)(response_ms) AS p95
FROM http_requests;
```

The level parameter is a float between 0 and 1. For multiple percentiles in one pass, use `quantilesTiming()`:

```sql
-- Compute p50, p75, p95, p99 in a single scan
SELECT quantilesTiming(0.5, 0.75, 0.95, 0.99)(response_ms) AS percentiles
FROM http_requests;
```

The result is an Array of Float32 values.

## Optimized for the 0-30000ms Range

`quantileTiming()` uses a deterministic, fixed-resolution data structure with granularity:
- 1ms steps for values 0 to 1023ms
- 16ms steps for values 1024ms to 30000ms
- Values above 30000ms are clamped to 30000. Negative values produce undefined behavior.

```sql
-- Values above 30000ms are clamped to 30000
-- Suitable for HTTP, database, and RPC latency
SELECT
    quantileTiming(0.95)(latency_ms) AS p95,
    quantileTiming(0.99)(latency_ms) AS p99
FROM api_calls
WHERE event_date = today();
```

This makes it much faster than sorting-based methods, at the cost of slight imprecision and the range restriction.

## Using quantileTimingWeighted()

Like other quantile functions, `quantileTiming()` has a weighted variant:

```sql
-- Weighted timing percentile using request count
SELECT quantileTimingWeighted(0.95)(response_ms, request_count) AS weighted_p95
FROM aggregated_request_stats
WHERE date = today();
```

This is useful when your table stores pre-aggregated metrics where each row represents multiple individual requests.

## Comparing with quantile() and quantileTDigest()

```sql
-- Side-by-side comparison for latency data
SELECT
    quantile(0.99)(response_ms)        AS approx_p99,
    quantileTiming(0.99)(response_ms)  AS timing_p99,
    quantileTDigest(0.99)(response_ms) AS tdigest_p99
FROM http_requests
WHERE event_date >= today() - 7;
```

For response time data in range, `quantileTiming()` is typically the fastest option. `quantileTDigest()` is more accurate at the tails. `quantile()` is a general-purpose option but less specialized.

## Dashboard Query Example

```sql
-- Latency percentiles by endpoint per hour
SELECT
    toStartOfHour(timestamp)           AS hour,
    endpoint,
    quantileTiming(0.50)(response_ms)  AS p50,
    quantileTiming(0.95)(response_ms)  AS p95,
    quantileTiming(0.99)(response_ms)  AS p99,
    count()                            AS total_requests
FROM http_requests
WHERE event_date >= today() - 1
GROUP BY hour, endpoint
ORDER BY hour DESC, p99 DESC;
```

## Materialized View for Continuous Latency Tracking

```sql
-- Accumulate timing state incrementally
CREATE MATERIALIZED VIEW latency_hourly_mv
ENGINE = AggregatingMergeTree()
ORDER BY (hour, endpoint)
AS
SELECT
    toStartOfHour(timestamp) AS hour,
    endpoint,
    quantileTimingState(0.95)(response_ms) AS p95_state,
    quantileTimingState(0.99)(response_ms) AS p99_state
FROM http_requests
GROUP BY hour, endpoint;

-- Query materialized state
SELECT
    hour,
    endpoint,
    quantileTimingMerge(0.95)(p95_state) AS p95,
    quantileTimingMerge(0.99)(p99_state) AS p99
FROM latency_hourly_mv
GROUP BY hour, endpoint
ORDER BY hour DESC;
```

## Summary

`quantileTiming()` is the fastest and most memory-efficient ClickHouse quantile function for HTTP and service latency data in the 0-30000ms range. Its fixed-resolution data structure avoids sorting and delivers consistent performance on high-volume request tables. Use `quantileTimingWeighted()` with pre-aggregated tables, and fall back to `quantileTDigest()` when you need better tail accuracy or values outside the supported range.
