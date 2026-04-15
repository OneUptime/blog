# How to Use SAMPLE Clause in ClickHouse for Approximate Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, SAMPLE, Approximate Query, Performance

Description: Learn how to use the SAMPLE clause in ClickHouse to run fast approximate queries on a fraction of data, with consistent and reproducible sampling.

---

The `SAMPLE` clause in ClickHouse lets you run queries against a representative subset of your data instead of the full table. This trades a small amount of accuracy for a large reduction in query time and resource usage - useful for dashboards, explorative analysis, and canary checks on massive datasets. ClickHouse sampling is deterministic per sampling key, meaning repeated queries with the same sample size return the same rows, making results reproducible.

## Enabling Sampling - SAMPLE BY in Table Definition

For `SAMPLE` to work, the table must be defined with a `SAMPLE BY` clause in its `CREATE TABLE` statement. The sampling expression must be contained in the `PRIMARY KEY` and must evaluate to an unsigned integer. Use a hash function like `intHash32` to ensure uniform distribution across the sample space.

```sql
CREATE TABLE user_events
(
    user_id    UInt64,
    event_type LowCardinality(String),
    event_time DateTime,
    value      Float64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (intHash32(user_id), event_time)
SAMPLE BY intHash32(user_id);  -- sampling key; must be in ORDER BY
```

## SAMPLE with a Fraction

`SAMPLE k` where `0 < k < 1` reads approximately `k * 100%` of the data. Results are consistent across runs.

```sql
-- Read approximately 10% of data
SELECT count()
FROM user_events
SAMPLE 0.1;

-- Read approximately 1% of data
SELECT
    event_type,
    count() * 100 AS estimated_count,  -- scale up by 1/sample_rate
    avg(value)    AS avg_value
FROM user_events
SAMPLE 0.01
GROUP BY event_type;
```

Multiply aggregate counts by `1 / sample_rate` to estimate totals for the full dataset:

```sql
SELECT
    event_type,
    count() / 0.1 AS estimated_total_events
FROM user_events
SAMPLE 0.1
GROUP BY event_type
ORDER BY estimated_total_events DESC;
```

## SAMPLE with an Absolute Row Count

`SAMPLE n` where `n >= 1` reads at least `n` rows (rounded up to the nearest granule boundary).

```sql
-- Read approximately 1,000,000 rows
SELECT count()
FROM user_events
SAMPLE 1000000;

-- Quick scan with a fixed row budget
SELECT
    user_id,
    sum(value) AS total_value
FROM user_events
SAMPLE 100000
GROUP BY user_id
ORDER BY total_value DESC
LIMIT 20;
```

## Reproducible Sampling with SAMPLE k OFFSET m

The `OFFSET` parameter shifts the sample window across the hash space, letting you select non-overlapping samples for cross-validation or A/B testing.

```sql
-- First 10% of the hash space
SELECT count()
FROM user_events
SAMPLE 0.1 OFFSET 0.0;

-- Second 10% (non-overlapping with first)
SELECT count()
FROM user_events
SAMPLE 0.1 OFFSET 0.1;

-- Third 10%
SELECT count()
FROM user_events
SAMPLE 0.1 OFFSET 0.2;
```

The entire hash space is `[0, 1)`. With `SAMPLE 0.1 OFFSET 0.3`, ClickHouse reads the slice `[0.3, 0.4)`.

## Accessing the Sample Rate with _sample_factor

ClickHouse exposes a virtual column `_sample_factor` that contains the reciprocal of the sampling rate (`1 / rate`). Use it to scale aggregates without hardcoding the rate:

```sql
SELECT
    event_type,
    count() * any(_sample_factor) AS estimated_total
FROM user_events
SAMPLE 0.05
GROUP BY event_type;
```

## Combining SAMPLE with WHERE and GROUP BY

`SAMPLE` reduces the number of rows scanned before `WHERE` filtering. The two work together naturally:

```sql
SELECT
    toDate(event_time) AS day,
    count() * 10       AS estimated_events,
    avg(value)         AS avg_value
FROM user_events
SAMPLE 0.1
WHERE event_type = 'purchase'
  AND event_time >= '2024-01-01'
GROUP BY day
ORDER BY day;
```

## Distributed SAMPLE Behavior

On distributed tables, `SAMPLE` is applied independently on each shard. The effective sample fraction is approximately the requested fraction, not exactly, because each shard samples from its own data independently.

```sql
-- On a 4-shard distributed table, SAMPLE 0.1 samples 10% on each shard
SELECT count()
FROM distributed_events
SAMPLE 0.1;
-- Result is approximately 10% of total rows, distributed evenly across shards
```

## Summary

The `SAMPLE` clause reads a consistent, deterministic subset of a MergeTree table defined with `SAMPLE BY`. Use `SAMPLE k` for a fractional sample and `SAMPLE n` for an approximate row count. The `OFFSET` parameter enables non-overlapping sampling windows for reproducible splits. Scale count-based aggregates by `1 / sample_rate` (or use `_sample_factor`) to estimate full-dataset totals from sampled results.
