# How to Use SAMPLE Clause for Query Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, SQL, Analytics, Database

Description: Learn how to use ClickHouse's SAMPLE clause to run statistically accurate queries on a fraction of your data, dramatically reducing query time on large tables.

## Introduction

When a table has billions of rows, even simple aggregations can take seconds or minutes because ClickHouse must read and process every row. The `SAMPLE` clause solves this by reading only a representative fraction of the data and returning statistically accurate approximate results. For many analytics use cases - dashboards, trend detection, anomaly monitoring - approximate results computed in milliseconds are more valuable than exact results that take minutes.

ClickHouse `SAMPLE` is not random sampling. It uses a deterministic hash on the sampling key, which means the same sample fraction always returns the same rows, enabling consistent results and cache-friendly behavior.

## Prerequisites: Setting Up the Sampling Key

For `SAMPLE` to work, the table must define a `SAMPLE BY` clause in its DDL. The sampling expression must be included in the primary key (which defaults to the `ORDER BY` key), and should use a hash function to ensure uniform distribution across the value range.

```sql
CREATE TABLE user_events
(
    user_id     UInt64,
    event_type  LowCardinality(String),
    value       Float64,
    event_time  DateTime
)
ENGINE = MergeTree()
ORDER BY (intHash32(user_id), event_time)
SAMPLE BY intHash32(user_id);
```

The `SAMPLE BY intHash32(user_id)` hashes `user_id` to produce uniformly distributed values for sample selection. Since all rows with the same `user_id` produce the same hash, sampling selects whole users rather than individual rows, preserving per-user behavioral coherence in the sample.

## Basic SAMPLE Usage

```sql
-- Read exactly 10% of rows
SELECT
    event_type,
    count()            AS sampled_count,
    count() * 10       AS estimated_total,
    avg(value)         AS avg_value
FROM user_events
SAMPLE 0.1
GROUP BY event_type
ORDER BY estimated_total DESC;
```

```sql
-- Read an absolute number of rows (approximately 1 million)
SELECT count()
FROM user_events
SAMPLE 1000000;
```

```sql
-- Sample by fraction with an offset (for splitting data across parallel queries)
-- Shard 1: first quarter
SELECT count() FROM user_events SAMPLE 0.25 OFFSET 0;
-- Shard 2: second quarter
SELECT count() FROM user_events SAMPLE 0.25 OFFSET 0.25;
-- Shard 3: third quarter
SELECT count() FROM user_events SAMPLE 0.25 OFFSET 0.5;
-- Shard 4: fourth quarter
SELECT count() FROM user_events SAMPLE 0.25 OFFSET 0.75;
```

## Scaling Results Back to Full Dataset Size

When sampling, multiply count results by `1/sample_fraction` to estimate totals. Use `_sample_factor` to get the exact factor that was applied.

```sql
SELECT
    event_type,
    count()                      AS sample_count,
    count() * _sample_factor     AS estimated_total_count,
    sum(value)                   AS sample_sum,
    sum(value) * _sample_factor  AS estimated_total_sum,
    avg(value)                   AS avg_value  -- averages don't need scaling
FROM user_events
SAMPLE 0.1
GROUP BY event_type
ORDER BY estimated_total_count DESC;
```

`_sample_factor` is a virtual column that ClickHouse populates automatically when `SAMPLE` is used.

## Comparing Sample vs Full Scan Performance

```sql
-- Full scan
SELECT count(), avg(value) FROM user_events;
-- Elapsed: 12.3 seconds, reads 5B rows

-- 1% sample
SELECT count() * 100 AS estimated_count, avg(value) FROM user_events SAMPLE 0.01;
-- Elapsed: 0.14 seconds, reads 50M rows
-- avg(value) error: < 0.5%
```

The accuracy of averages and ratios improves with larger samples. Use the following rule of thumb:

| Sample Fraction | Typical Error on avg/ratio | Use Case |
|---|---|---|
| 0.001 (0.1%) | ~3% | Rough trend detection |
| 0.01 (1%) | ~1% | Dashboard metrics |
| 0.1 (10%) | ~0.3% | Reporting, anomaly detection |
| 0.5 (50%) | ~0.1% | High-accuracy approximation |

## Using SAMPLE for Cardinality Estimation

Estimating the number of distinct values across billions of rows is expensive. Sampling makes it tractable.

```sql
-- Estimate distinct user count via 10% sample
SELECT
    uniq(user_id) * 10       AS estimated_distinct_users,
    uniqExact(user_id) * 10  AS estimated_exact_distinct_users
FROM user_events
SAMPLE 0.1;
```

For very high cardinality, combine `SAMPLE` with `uniqHLL12` for even faster estimates:

```sql
SELECT uniqHLL12(user_id) * 10 AS estimated_distinct_users
FROM user_events
SAMPLE 0.1;
```

## Consistent Sampling Across JOINs

Because ClickHouse sampling is deterministic and hash-based, the same user always lands in the same sample bucket. This makes it safe to join two sampled tables using the same sampling key and fraction.

```sql
-- Both tables must define SAMPLE BY with a compatible expression (e.g., intHash32(user_id))
-- The same 10% of users are selected from each table due to deterministic hashing
SELECT
    e.user_id,
    count(e.event_type)  AS event_count,
    p.plan_name
FROM user_events e SAMPLE 0.1
JOIN user_profiles p SAMPLE 0.1 ON e.user_id = p.user_id
GROUP BY e.user_id, p.plan_name
ORDER BY event_count DESC
LIMIT 20;
```

If the sampling expressions differ between tables, do not rely on sample consistency across joins.

## Adaptive Sampling for Interactive Dashboards

For dashboards that must respond within a time budget, use a small sample fraction and let `_sample_factor` handle the scaling automatically:

```sql
-- Fixed sample with automatic scaling via _sample_factor
SELECT
    event_type,
    count() * _sample_factor AS estimated_count
FROM user_events
SAMPLE 0.01
GROUP BY event_type;
```

To adapt the sample fraction based on table size, let your application layer pass the fraction dynamically:

```sql
-- Application sets @sample_fraction = 0.01 for large tables, 1.0 for small ones
SELECT
    toDate(event_time) AS date,
    count() * (1.0 / {sample_fraction:Float64}) AS estimated_events
FROM user_events
SAMPLE {sample_fraction:Float64}
GROUP BY date
ORDER BY date;
```

## Limitations of SAMPLE

- `SAMPLE` requires `SAMPLE BY` in the table DDL. You cannot sample a table that was not created with a sampling key.
- `COUNT DISTINCT` and `uniqExact` need explicit scaling; use `uniq` or `uniqHLL12` instead for better performance.
- Very skewed distributions (e.g., 99% of events from one user) can produce biased samples. In these cases, sample at a higher fraction or use `LIMIT` instead.
- Distributed tables support `SAMPLE` natively; each shard applies the same fraction independently.

## Summary

The `SAMPLE` clause in ClickHouse enables sub-second approximate queries on tables with billions of rows by reading a deterministic, hash-based fraction of the data. Define `SAMPLE BY` in your table DDL, use `_sample_factor` to scale counts and sums back to full-table estimates, and rely on consistent sampling behavior when joining sampled tables on the same key. For interactive analytics and dashboards, sampling fractions between 1% and 10% typically deliver accuracy within 1% at 10-100x the speed of a full scan.
