# How to Use quantileGK() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Quantile, Statistics

Description: Learn how to use quantileGK() in ClickHouse, which implements the Greenwald-Khanna algorithm for accurate approximate quantiles with a guaranteed error bound.

---

`quantileGK(accuracy, level)(value)` computes an approximate quantile using the Greenwald-Khanna (GK) streaming algorithm. Unlike `quantileTDigest`, which approximates with variable accuracy, GK provides an epsilon-accuracy guarantee: the returned quantile is within `1/accuracy` of the true rank with high probability. The `accuracy` parameter is a positive integer — larger values mean tighter bounds (e.g., `accuracy=100` gives a 1% error bound). This makes it the right choice when you need a provable error bound rather than a best-effort approximation.

## Syntax

```sql
-- Single quantile with accuracy parameter and level phi
SELECT quantileGK(accuracy, level)(value_column) FROM table_name;

-- accuracy: positive integer, error bound is 1/accuracy, e.g. 100 means within 1% of the true rank
-- level: the quantile to compute, e.g. 0.95 for the 95th percentile
```

## Basic Example

```sql
-- p95 latency with a 1% accuracy guarantee (accuracy=100 means error ≤ 1/100 = 1%)
SELECT quantileGK(100, 0.95)(response_time_ms) AS p95_latency_ms
FROM request_logs
WHERE log_date = today();
```

This guarantees the returned value is within 1% of the true 95th percentile rank with high probability.

## Accuracy vs Memory Trade-off

The GK algorithm uses more memory as `accuracy` increases (tighter bound, since error = `1/accuracy`).

```sql
-- Compare different accuracy levels
SELECT
    quantileGK(20, 0.95)(response_time_ms)    AS p95_accuracy_5pct,
    quantileGK(100, 0.95)(response_time_ms)   AS p95_accuracy_1pct,
    quantileGK(1000, 0.95)(response_time_ms)  AS p95_accuracy_01pct,
    quantileExact(0.95)(response_time_ms)      AS p95_exact
FROM request_logs
WHERE log_date = today();
```

## Multiple Quantiles in One Scan

```sql
-- Full percentile profile with GK algorithm
SELECT
    service_name,
    quantileGK(100, 0.50)(response_time_ms) AS p50_ms,
    quantileGK(100, 0.75)(response_time_ms) AS p75_ms,
    quantileGK(100, 0.90)(response_time_ms) AS p90_ms,
    quantileGK(100, 0.95)(response_time_ms) AS p95_ms,
    quantileGK(100, 0.99)(response_time_ms) AS p99_ms,
    count() AS request_count
FROM request_logs
WHERE log_date >= today() - 7
GROUP BY service_name
ORDER BY p95_ms DESC;
```

## When to Choose quantileGK vs Other Quantile Functions

```mermaid
flowchart TD
    A[Need a quantile estimate?] --> B{Need exact result?}
    B -->|Yes| C[Use quantileExact - exact but O N memory]
    B -->|No - approximate is fine| D{Need strict error bound?}
    D -->|Yes - GK guarantee required| E[Use quantileGK - epsilon guaranteed]
    D -->|No - best effort OK| F{Tail accuracy priority?}
    F -->|Yes - tails matter most| G[Use quantileTDigest]
    F -->|No - speed and low memory| H[Use quantileTDigest or quantileBFloat16]
```

## SLA Monitoring with Error Bound

```sql
-- Compute p99 with 0.5% accuracy - suitable for SLA alerting
SELECT
    toStartOfHour(timestamp) AS hour,
    service_name,
    quantileGK(200, 0.99)(response_time_ms) AS p99_ms,
    countIf(response_time_ms > 1000)         AS over_sla_count,
    count()                                  AS total
FROM request_logs
WHERE timestamp >= now() - INTERVAL 24 HOUR
GROUP BY hour, service_name
ORDER BY hour DESC;
```

## Incremental Aggregation with -State and -Merge

```sql
CREATE TABLE hourly_quantile_gk
(
    stat_hour   DateTime,
    service     String,
    p95_state   AggregateFunction(quantileGK(100, 0.95), Float64),
    p99_state   AggregateFunction(quantileGK(100, 0.99), Float64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (stat_hour, service);

CREATE MATERIALIZED VIEW mv_hourly_quantile_gk
TO hourly_quantile_gk
AS
SELECT
    toStartOfHour(timestamp)                                  AS stat_hour,
    service_name                                              AS service,
    quantileGKState(100, 0.95)(toFloat64(response_time_ms))   AS p95_state,
    quantileGKState(100, 0.99)(toFloat64(response_time_ms))   AS p99_state
FROM request_logs
GROUP BY stat_hour, service;

-- Query
SELECT
    stat_hour,
    service,
    quantileGKMerge(100, 0.95)(p95_state) AS p95_ms,
    quantileGKMerge(100, 0.99)(p99_state) AS p99_ms
FROM hourly_quantile_gk
GROUP BY stat_hour, service
ORDER BY stat_hour DESC;
```

## Comparing GK to TDigest Accuracy

```sql
-- Side-by-side comparison: GK vs TDigest vs Exact for validation
SELECT
    quantileGK(100, 0.99)(response_time_ms)        AS p99_gk_1pct,
    quantileTDigest(0.99)(response_time_ms)         AS p99_tdigest,
    quantileExact(0.99)(response_time_ms)           AS p99_exact,
    abs(quantileGK(100, 0.99)(response_time_ms)
        - quantileExact(0.99)(response_time_ms))    AS gk_error_ms,
    count()                                         AS n
FROM request_logs
WHERE log_date = today();
```

## Summary

`quantileGK(accuracy, level)(value)` implements the Greenwald-Khanna streaming algorithm, providing an epsilon-accuracy guarantee with high probability: the result rank will not deviate by more than `1/accuracy` from the true rank. The `accuracy` parameter is a positive integer — larger values yield tighter bounds. Use it when you need a mathematical guarantee on approximation quality rather than best-effort accuracy, such as for SLA reporting, compliance monitoring, or scenarios where the cost of an inaccurate percentile is high. For best-effort approximation with good tail accuracy, prefer `quantileTDigest`; for exact results at higher memory cost, use `quantileExact`.
