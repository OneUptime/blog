# How to Use SAMPLE BY Clause in MergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Sampling, Performance, SQL, Database, Analytics

Description: Learn how to use the SAMPLE BY clause in ClickHouse MergeTree tables to enable fast probabilistic query sampling, reduce query latency on huge datasets, and build approximate analytics dashboards.

---

The `SAMPLE BY` clause in ClickHouse MergeTree tables enables probabilistic data sampling at query time. Instead of scanning all rows, you can query a representative fraction of the data and multiply the results to get accurate estimates - delivering results in milliseconds even on trillion-row tables.

## What Is SAMPLE BY?

When you define `SAMPLE BY` on a MergeTree table, ClickHouse physically co-locates rows with similar sample key values on disk. At query time, the `SAMPLE` clause can then skip large contiguous ranges of data while maintaining statistical representativeness.

```sql
CREATE TABLE events
(
    ts       DateTime,
    user_id  UInt64,
    event    LowCardinality(String),
    revenue  Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, sipHash64(user_id))
SAMPLE BY sipHash64(user_id);
```

## Syntax Requirements

```sql
ENGINE = MergeTree()
ORDER BY (primary_key_cols..., sample_key)
SAMPLE BY sample_key
```

**Critical constraints:**

1. The `SAMPLE BY` expression must be included in the primary key (and consequently in the `ORDER BY` clause, since the primary key is always a prefix of the sorting key).
2. The sample key must evaluate to an unsigned integer (use hash functions for non-integer columns).
3. Common hash functions: `sipHash64()`, `cityHash64()`, `intHash32()`.

## Basic Sampling Query

```sql
-- Query 1% of data
SELECT count() / 0.01 AS estimated_total_events
FROM events
SAMPLE 0.01;

-- Query 10% of data
SELECT
    toDate(ts)  AS date,
    event,
    count() / 0.1    AS est_count,
    sum(revenue) / 0.1 AS est_revenue
FROM events
SAMPLE 0.1
GROUP BY date, event
ORDER BY date DESC, est_revenue DESC;
```

## SAMPLE Clause Variants

```sql
-- Fraction (0 to 1)
SELECT count() FROM events SAMPLE 0.01;  -- ~1% of rows

-- Fixed row count (ClickHouse picks the minimum needed sample)
SELECT count() FROM events SAMPLE 100000;  -- at least 100K rows

-- Fraction with offset (for parallel sampling)
SELECT count() FROM events SAMPLE 1/10 OFFSET 3/10;  -- rows in bucket 3 of 10
```

## Consistent Sampling Across Tables

The key benefit of `SAMPLE BY sipHash64(user_id)` is that the same user always ends up in the same sample bucket. This means you can join sampled tables and get consistent results:

```sql
-- Both tables use SAMPLE BY sipHash64(user_id)
-- Sampling 10% from both returns matching users
SELECT
    e.user_id,
    count() AS events,
    sum(o.amount) AS revenue
FROM events   SAMPLE 0.1 AS e
JOIN orders   SAMPLE 0.1 AS o ON e.user_id = o.user_id
GROUP BY e.user_id
ORDER BY revenue DESC
LIMIT 100;
```

If you sampled inconsistently (e.g., different hash functions), the same user might appear in one table's sample but not the other's, producing wrong join results.

## Estimating Totals with Sampling

Use `_sample_factor` to get the exact scaling factor rather than hardcoding it:

```sql
-- _sample_factor is the reciprocal of the actual sample fraction
SELECT
    count() * any(_sample_factor) AS estimated_events,
    sum(revenue) * any(_sample_factor) AS estimated_revenue
FROM events
SAMPLE 0.01;
```

## Full Table Definition with SAMPLE BY

```sql
CREATE TABLE user_events
(
    ts              DateTime,
    user_id         UInt64,
    session_id      UInt64,
    event_type      LowCardinality(String),
    page_url        String,
    duration_ms     UInt32,
    revenue         Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (toDate(ts), sipHash64(user_id), user_id, ts)
PRIMARY KEY (toDate(ts), sipHash64(user_id))
SAMPLE BY sipHash64(user_id)
SETTINGS index_granularity = 8192;
```

## Use Case: Approximate Dashboard Queries

Real-time dashboards often need sub-second responses. Sampling trades a small accuracy loss for massive speed gains:

```sql
-- Full scan: might take 30 seconds on 100B rows
SELECT
    toStartOfHour(ts) AS hour,
    event_type,
    count()           AS events
FROM user_events
WHERE ts >= now() - INTERVAL 24 HOUR
GROUP BY hour, event_type;

-- Sampled: returns in < 1 second, results within 1-3% accuracy
SELECT
    toStartOfHour(ts)          AS hour,
    event_type,
    count() * any(_sample_factor) AS estimated_events
FROM user_events
SAMPLE 0.01
WHERE ts >= now() - INTERVAL 24 HOUR
GROUP BY hour, event_type;
```

## Unique User Estimation

Approximate unique user counts via sampling:

```sql
-- Uniq on a 10% sample, scaled up
SELECT
    toDate(ts) AS date,
    uniq(user_id) * any(_sample_factor) AS estimated_unique_users
FROM user_events
SAMPLE 0.1
WHERE ts >= now() - INTERVAL 30 DAY
GROUP BY date
ORDER BY date;
```

Note: `uniq()` is already approximate. Sampling on top of it compounds the approximation slightly, but the result is typically within a few percent.

## Parallel Sampling with OFFSET

Divide sampling work across multiple queries for parallel processing:

```sql
-- Worker 1: process bucket 0/4
SELECT sum(revenue) FROM orders SAMPLE 1/4 OFFSET 0/4;

-- Worker 2: process bucket 1/4
SELECT sum(revenue) FROM orders SAMPLE 1/4 OFFSET 1/4;

-- Worker 3: process bucket 2/4
SELECT sum(revenue) FROM orders SAMPLE 1/4 OFFSET 2/4;

-- Worker 4: process bucket 3/4
SELECT sum(revenue) FROM orders SAMPLE 1/4 OFFSET 3/4;

-- Combine all four sums to get the total
```

## Choosing a Sample Key

| Use case | Recommended SAMPLE BY |
|---|---|
| User-centric analytics | `sipHash64(user_id)` |
| Event-level analytics | `sipHash64(event_id)` |
| Session-level analytics | `sipHash64(session_id)` |
| Request-level analytics | `sipHash64(request_id)` |
| Already-integer keys | `user_id` (if uniformly distributed) |

Avoid non-uniform distributions (e.g., sequential IDs that cluster by time) as they reduce sample quality.

## Verifying Sample Quality

Check that sampling produces consistent estimates across different sample rates:

```sql
SELECT
    '1%'   AS sample, count() * 100 AS est_rows FROM user_events SAMPLE 0.01
UNION ALL
SELECT
    '5%',  count() * 20  FROM user_events SAMPLE 0.05
UNION ALL
SELECT
    '10%', count() * 10  FROM user_events SAMPLE 0.1
UNION ALL
SELECT
    '100%', count()      FROM user_events;
```

If the estimates are within a few percent of each other, your sample key is distributing data uniformly.

## Performance Impact of SAMPLE BY on Storage

`SAMPLE BY` requires that the sample key expression is part of the primary key (and therefore the `ORDER BY`). This changes how data is physically sorted on disk. For some queries that filter only by time (not by user), this can reduce primary key efficiency slightly. Measure both before committing to `SAMPLE BY` in your schema.

## Summary

The `SAMPLE BY` clause transforms ClickHouse into a high-speed approximate query engine. Key points:

- `SAMPLE BY` is typically defined at table creation time. It can be modified later with `ALTER TABLE ... MODIFY SAMPLE BY`, but the new expression must already be part of the primary key.
- Use `sipHash64()` for consistent, uniform sampling of non-integer keys.
- The sample key must appear in the primary key (and therefore in `ORDER BY`).
- Consistent sampling across tables (same hash function, same key) enables accurate sampled joins.
- Use `_sample_factor` for automatic scaling rather than hardcoding the sample fraction.
- `SAMPLE BY` is ideal for dashboards, real-time monitoring, and exploratory analytics on huge datasets.
