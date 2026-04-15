# How to Use t-digest for Quantile Estimation in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, T-Digest, Quantile, Approximate Query, Analytics

Description: Learn how to use t-digest for accurate and memory-efficient quantile estimation in ClickHouse for percentile analytics at scale.

---

## What Is t-digest?

t-digest is a probabilistic data structure that provides highly accurate quantile estimates while consuming very little memory. In ClickHouse, the `quantileTDigest` and `quantileTDigestWeighted` aggregate functions implement this algorithm, making it ideal for P50, P95, and P99 percentile calculations over billions of rows.

## Why Use t-digest Over Exact Quantiles?

Exact quantile computation requires sorting all data, which is expensive at scale. t-digest achieves high accuracy near the tails (P99, P99.9) - exactly where it matters most for latency and SLA monitoring - while using a fixed, bounded memory footprint.

## Basic Usage

```sql
SELECT quantileTDigest(0.95)(response_time_ms)
FROM http_logs
WHERE toDate(timestamp) = today();
```

Compute multiple quantiles in a single pass:

```sql
SELECT
    quantileTDigest(0.50)(response_time_ms) AS p50,
    quantileTDigest(0.95)(response_time_ms) AS p95,
    quantileTDigest(0.99)(response_time_ms) AS p99
FROM http_logs
WHERE service = 'api-gateway';
```

Use the plural form for efficiency when you need several quantiles:

```sql
SELECT quantilesTDigest(0.5, 0.9, 0.95, 0.99)(response_time_ms)
FROM http_logs;
```

## Weighted Variant

When data points carry different weights (e.g., sampled data), use the weighted variant:

```sql
SELECT quantileTDigestWeighted(0.99)(response_time_ms, sample_weight)
FROM sampled_logs;
```

## Compression and Accuracy

The `quantileTDigest` function in ClickHouse uses fixed internal parameters for compression (including a default error bound of approximately 1%) and does not expose a compression parameter in SQL. You cannot tune the accuracy of `quantileTDigest` at query time.

If you need configurable accuracy, use `quantileDD` instead, which accepts a relative accuracy parameter:

```sql
SELECT quantileDD(0.01, 0.99)(response_time_ms)
FROM http_logs;
```

The first argument (`0.01`) controls the relative error bound — lower values yield higher accuracy at the cost of more memory.

## Using t-digest in Materialized Views

Pre-aggregate t-digest states for fast dashboard queries:

```sql
CREATE MATERIALIZED VIEW response_time_mv
ENGINE = AggregatingMergeTree()
ORDER BY (service, toStartOfHour(timestamp))
AS
SELECT
    service,
    toStartOfHour(timestamp) AS hour,
    quantileTDigestState(0.95)(response_time_ms) AS p95_state
FROM http_logs
GROUP BY service, hour;
```

Query the materialized view:

```sql
SELECT
    service,
    hour,
    quantileTDigestMerge(0.95)(p95_state) AS p95
FROM response_time_mv
GROUP BY service, hour
ORDER BY hour;
```

## Accuracy Characteristics

The t-digest algorithm provides higher accuracy near the tails (quantiles close to 0 or 1) than in the middle of the distribution. ClickHouse's implementation uses an internal error bound of approximately 1%. This means a true P99 of 500ms will be estimated as approximately 495-505ms.

## When to Choose t-digest

Use t-digest when:
- Calculating high-percentile latencies (P95, P99, P99.9)
- Pre-aggregating states in materialized views
- Memory is constrained but tail accuracy is important

For P50 (median) calculations where extreme accuracy is not required, `quantile` (reservoir sampling) is faster with less overhead.

## Summary

t-digest in ClickHouse provides a practical balance of memory efficiency and high accuracy for tail quantiles. By using `quantileTDigest` and its state-based forms in materialized views, you can serve sub-second percentile queries over billions of rows without sacrificing precision where it matters most.
