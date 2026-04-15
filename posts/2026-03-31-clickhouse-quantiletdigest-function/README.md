# How to Use quantileTDigest() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, quantileTDigest, T-Digest, Percentile

Description: Learn how quantileTDigest() uses the t-digest algorithm in ClickHouse for memory-efficient approximate percentiles with high accuracy at distribution extremes.

---

ClickHouse's `quantileTDigest()` function implements the t-digest algorithm, a data structure designed for accurate approximate quantile estimation. Unlike reservoir sampling used by `quantile()`, t-digest provides especially high accuracy at the tails of a distribution (p99, p999) while maintaining low memory usage. This makes it well-suited for latency and performance monitoring workloads.

## Basic Syntax

```sql
-- Compute 95th percentile using t-digest
SELECT quantileTDigest(0.95)(response_time) AS p95
FROM requests;
```

The level parameter must be between 0 and 1 (exclusive or inclusive). You can compute multiple quantiles using `quantilesTDigest()`:

```sql
-- Multiple percentiles in one pass
SELECT quantilesTDigest(0.5, 0.75, 0.9, 0.95, 0.99)(response_time) AS percentiles
FROM requests;
```

## How the T-Digest Algorithm Works

The t-digest algorithm maintains a compact summary of the data distribution using a set of centroids. Each centroid stores a mean and weight. Centroids near the tails (0 and 1) are kept small (few data points each), which gives high resolution at the extremes. Centroids near the middle are allowed to be larger.

This design means:
- Tail percentiles (p95, p99, p999) are more accurate than with reservoir sampling
- Memory usage scales with the compression parameter, not dataset size
- Results are mergeable across shards, making distributed queries accurate

## Accuracy at Extremes

```sql
-- Compare t-digest vs reservoir sampling at the 99th percentile
SELECT
    quantile(0.99)(response_time)       AS approx_p99_reservoir,
    quantileTDigest(0.99)(response_time) AS approx_p99_tdigest
FROM requests
WHERE event_date >= today() - 30;
```

For p99 and above, `quantileTDigest()` tends to produce more reliable estimates than `quantile()`, particularly with skewed distributions like HTTP latency.

## Memory Efficiency

```sql
-- T-digest uses fixed bounded memory regardless of row count
SELECT
    count()                              AS total_rows,
    quantileTDigest(0.99)(response_time) AS p99
FROM large_events_table;
```

The internal state size for `quantileTDigest()` grows as `log(n)` where `n` is the number of values processed, making it far more memory-efficient than storing all values. This makes it safe to use on large datasets without OOM risk.

## Using quantileTDigestWeighted()

Like other quantile variants, `quantileTDigest()` has a weighted version:

```sql
-- Weighted t-digest percentile
SELECT quantileTDigestWeighted(0.95)(latency_ms, request_count) AS weighted_p95
FROM aggregated_metrics
WHERE date = today();
```

The weight column multiplies the contribution of each row to the t-digest structure, allowing pre-aggregated data to produce correctly weighted results.

## Practical Example - Tail Latency Monitoring

```sql
-- Monitor tail latency per endpoint
SELECT
    endpoint,
    quantileTDigest(0.50)(latency_ms) AS p50,
    quantileTDigest(0.95)(latency_ms) AS p95,
    quantileTDigest(0.99)(latency_ms) AS p99,
    quantileTDigest(0.999)(latency_ms) AS p999
FROM http_requests
WHERE event_date >= today() - 1
GROUP BY endpoint
ORDER BY p999 DESC
LIMIT 20;
```

## Merging T-Digest States

`quantileTDigest()` supports state merging, which is useful in materialized views and incremental aggregations:

```sql
-- Store intermediate state in a materialized view
CREATE MATERIALIZED VIEW latency_mv
ENGINE = AggregatingMergeTree()
ORDER BY (date, service)
AS
SELECT
    toDate(timestamp) AS date,
    service,
    quantileTDigestState(0.99)(latency_ms) AS p99_state
FROM requests
GROUP BY date, service;

-- Query the merged state
SELECT
    date,
    service,
    quantileTDigestMerge(0.99)(p99_state) AS p99
FROM latency_mv
GROUP BY date, service;
```

## Summary

`quantileTDigest()` is the recommended approximate quantile function when tail accuracy matters, such as p99 and p999 latency tracking. Its bounded memory footprint and mergeable state make it well-suited for both real-time queries and incremental materialized views. Use `quantileTDigestWeighted()` when working with pre-aggregated data that includes a count or weight column.
