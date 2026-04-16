# How to Use quantileTiming() in ClickHouse for Latency Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Latency, Quantile, Performance, Monitoring

Description: Learn how to use quantileTiming() in ClickHouse, a specialized quantile function optimized for latency and response time data with millisecond precision.

---

## Overview

`quantileTiming()` is a ClickHouse aggregate function designed specifically for timing data such as HTTP response latencies, database query durations, and similar non-negative millisecond-range values. It uses a fixed-size array internally, making it extremely fast and memory-efficient for this use case.

## Basic Usage

```sql
SELECT quantileTiming(0.95)(response_time_ms)
FROM api_requests;
```

Returns the 95th percentile of `response_time_ms`.

## How It Differs from quantile()

`quantileTiming()` assumes:
- Values are non-negative
- Values fit in a reasonable millisecond range (0 to ~30 seconds)
- Values are integers or floats treated as milliseconds

It uses a deterministic fixed-size histogram instead of reservoir sampling, which makes it faster and fully deterministic for timing workloads.

```sql
-- Generic quantile (reservoir sampling, approximate)
SELECT quantile(0.99)(response_ms) FROM logs;

-- Timing-optimized quantile (faster for latency data)
SELECT quantileTiming(0.99)(response_ms) FROM logs;
```

## Multiple Percentiles with quantilesTiming()

```sql
SELECT
    endpoint,
    quantilesTiming(0.5, 0.9, 0.95, 0.99)(response_ms) AS q,
    q[1] AS p50,
    q[2] AS p90,
    q[3] AS p95,
    q[4] AS p99
FROM api_requests
GROUP BY endpoint
ORDER BY q[4] DESC;
```

## Latency Dashboard by Time Window

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count()                     AS req_count,
    quantileTiming(0.5)(latency_ms)  AS p50,
    quantileTiming(0.95)(latency_ms) AS p95,
    quantileTiming(0.99)(latency_ms) AS p99
FROM http_access_log
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Conditional Timing Analysis

Use the `-If` combinator to compute percentiles for specific subsets:

```sql
SELECT
    quantileTimingIf(0.95)(latency_ms, status_code = 200)    AS p95_ok,
    quantileTimingIf(0.95)(latency_ms, status_code >= 400)   AS p95_errors
FROM http_access_log
WHERE event_time >= today();
```

## Service-Level SLO Check

```sql
SELECT
    service,
    quantileTiming(0.99)(response_ms) AS p99_ms,
    if(p99_ms <= 500, 'PASS', 'FAIL') AS slo_status
FROM service_metrics
WHERE ts >= now() - INTERVAL 5 MINUTE
GROUP BY service;
```

## Handling Outliers

Values above 30,000 ms (30 seconds) are always clamped to 30,000 by `quantileTiming()`. For very high latency data, fall back to `quantile()` or pre-filter:

```sql
SELECT quantileTiming(0.99)(
    if(response_ms > 30000, 30000, response_ms)
)
FROM api_requests;
```

## Table Schema Example

```sql
CREATE TABLE api_requests (
    event_time   DateTime,
    endpoint     String,
    status_code  UInt16,
    response_ms  Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (endpoint, event_time);
```

## Summary

`quantileTiming()` is the recommended function for latency analysis in ClickHouse. It is faster and more deterministic than `quantile()` for millisecond-range timing data, supports all standard combinators like `-If`, and scales well even on large request-log tables. Use `quantilesTiming()` to compute multiple percentiles in one pass.
