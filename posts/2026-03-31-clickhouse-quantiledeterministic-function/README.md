# How to Use quantileDeterministic() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, quantileDeterministic, Percentile, Deterministic

Description: Learn how quantileDeterministic() in ClickHouse produces reproducible approximate percentiles by using a determinator column to control sampling selection.

---

ClickHouse's standard `quantile()` function uses reservoir sampling with non-deterministic behavior - the sample selected can vary between runs on the same data. `quantileDeterministic()` solves this by requiring a second argument called the "determinator", which is used to decide which rows are included in the sample. This guarantees that the same data always produces the same result.

## Basic Syntax

`quantileDeterministic()` takes a level parameter and two column arguments: the value to compute the quantile over, and the determinator column used for reproducible sampling.

```sql
-- Deterministic 95th percentile using user_id as determinator
SELECT quantileDeterministic(0.95)(response_time, user_id) AS p95
FROM requests;
```

The determinator column is hashed, and the hash is used to decide whether each row enters the reservoir sample. For the same dataset, the same determinator values always produce the same sample.

## How Reproducible Sampling Works

Standard reservoir sampling picks rows based on random numbers. `quantileDeterministic()` replaces that randomness with a deterministic hash of the determinator column.

```sql
-- Non-deterministic: result may differ between runs
SELECT quantile(0.95)(latency_ms) AS approx_p95
FROM events;

-- Deterministic: result is stable for the same data
SELECT quantileDeterministic(0.95)(latency_ms, request_id) AS stable_p95
FROM events;
```

This is useful for dashboards, alerting thresholds, and regression tests where you need consistent results.

## Choosing a Good Determinator

The determinator should be a column with high cardinality and uniform distribution. The determinator must be a `UInt64` value (or another integer type). Good choices include:
- Integer primary keys or auto-increment IDs
- Hash of string or UUID columns using `cityHash64()` or `sipHash64()`
- User IDs or request IDs stored as integers

```sql
-- Good: high cardinality integer column
SELECT quantileDeterministic(0.99)(duration_ms, request_id) AS p99
FROM traces;

-- Good: hash a UUID column to produce a UInt64 determinator
SELECT quantileDeterministic(0.99)(duration_ms, cityHash64(request_uuid)) AS p99
FROM traces;

-- Less ideal: low cardinality (only a few values)
-- This concentrates sampling around specific determinator values
SELECT quantileDeterministic(0.99)(duration_ms, status_code) AS p99
FROM traces;
```

## Computing Multiple Quantiles

Use `quantilesDeterministic()` to compute several quantiles in one pass:

```sql
-- Multiple percentiles with a single scan
SELECT quantilesDeterministic(0.5, 0.75, 0.9, 0.95, 0.99)(latency_ms, request_id) AS percentiles
FROM requests
WHERE event_date = today();
```

The result is an array of values in the order the levels were specified.

## Use Cases

### Regression Testing

```sql
-- Compare p99 across two code versions with same traffic window
SELECT
    version,
    quantileDeterministic(0.99)(response_time, request_id) AS p99
FROM requests
WHERE event_date = '2026-03-31'
GROUP BY version;
```

### Consistent Alerting

```sql
-- Alert threshold based on reproducible sample
SELECT
    service,
    quantileDeterministic(0.95)(latency_ms, trace_id) AS p95
FROM spans
WHERE timestamp >= now() - INTERVAL 5 MINUTE
GROUP BY service
HAVING p95 > 500;
```

### Materialized View with Deterministic State

```sql
-- Store state for later merging
CREATE MATERIALIZED VIEW latency_deterministic_mv
ENGINE = AggregatingMergeTree()
ORDER BY (date, service)
AS
SELECT
    toDate(timestamp) AS date,
    service,
    quantileDeterministicState(0.95)(latency_ms, request_id) AS p95_state
FROM requests
GROUP BY date, service;

-- Merge and query
SELECT
    date,
    service,
    quantileDeterministicMerge(0.95)(p95_state) AS p95
FROM latency_deterministic_mv
GROUP BY date, service;
```

## Summary

`quantileDeterministic()` extends ClickHouse's approximate quantile function with reproducible sampling by hashing a determinator column instead of using random numbers. It is best used when you need stable, repeatable percentile results across runs - such as regression comparisons, dashboards, and alert rules. Choose a high-cardinality column as the determinator to ensure the sample is representative of the full dataset.
