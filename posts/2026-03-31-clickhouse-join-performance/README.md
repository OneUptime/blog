# How to Optimize JOIN Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, SQL, Analytics, Database

Description: Learn how to choose the right JOIN algorithm, use dictionaries for dimension lookups, and structure queries to maximize JOIN performance in ClickHouse.

## Introduction

JOINs in ClickHouse are more nuanced than in row-oriented databases. Because ClickHouse is optimized for large-scale analytical reads rather than transactional queries, it handles JOINs differently: the right-hand table is loaded entirely into memory by default, and the join is executed using a hash table. Understanding this model is critical to writing fast JOIN queries.

This guide covers join algorithm selection, dictionary-based lookups as a JOIN alternative, distributed join strategies, and practical tuning settings.

## Understand the Default Hash JOIN

By default, ClickHouse reads the right-hand table into a hash table in memory, then streams through the left-hand table probing the hash table for each row.

```sql
-- Default behavior: users table (right side) is loaded into memory
SELECT
    e.user_id,
    u.plan_name,
    count()     AS events
FROM user_events AS e
JOIN users AS u ON e.user_id = u.user_id
GROUP BY e.user_id, u.plan_name
ORDER BY events DESC
LIMIT 20;
```

Keep the larger table on the left, the smaller lookup table on the right. This is the most important JOIN rule in ClickHouse.

## Choose the Right JOIN Algorithm

ClickHouse supports several join algorithms. Specify one explicitly with `SETTINGS join_algorithm`.

```sql
-- Hash join (default): right table in memory, best for small right tables
SELECT e.user_id, u.plan_name, count()
FROM user_events e
JOIN users u ON e.user_id = u.user_id
GROUP BY e.user_id, u.plan_name
SETTINGS join_algorithm = 'hash';

-- Parallel hash join: partitions the hash table across CPU threads
-- Best when both tables are large and memory is ample
SELECT e.user_id, u.plan_name, count()
FROM user_events e
JOIN users u ON e.user_id = u.user_id
GROUP BY e.user_id, u.plan_name
SETTINGS join_algorithm = 'parallel_hash';

-- Grace hash join: spills to disk when the hash table exceeds memory
-- Best when the right table does not fit in RAM
SELECT e.user_id, u.plan_name, count()
FROM user_events e
JOIN users u ON e.user_id = u.user_id
GROUP BY e.user_id, u.plan_name
SETTINGS join_algorithm = 'grace_hash', grace_hash_join_initial_buckets = 16;

-- Full sorting merge join: sorts both sides and merges
-- Best when both sides are already sorted on the join key
SELECT e.user_id, u.plan_name, count()
FROM user_events e
JOIN users u ON e.user_id = u.user_id
GROUP BY e.user_id, u.plan_name
SETTINGS join_algorithm = 'full_sorting_merge';
```

## Use Dictionaries Instead of JOINs for Dimension Lookups

The single best optimization for dimension lookups is replacing JOINs with dictionaries. A dictionary loads the lookup table into memory once and serves lookups via a key without the overhead of a JOIN operation.

```sql
-- Create a flat dictionary from the users table
CREATE DICTIONARY user_dict
(
    user_id   UInt64,
    plan_name String,
    country   String,
    created_at DateTime
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE users DB 'analytics'))
LAYOUT(HASHED())
LIFETIME(300);  -- refresh every 5 minutes

-- Replace JOIN with dictGet - dramatically faster
SELECT
    e.user_id,
    dictGet('user_dict', 'plan_name', e.user_id)  AS plan_name,
    dictGet('user_dict', 'country',   e.user_id)  AS country,
    count()                                        AS events
FROM user_events AS e
GROUP BY e.user_id, plan_name, country
ORDER BY events DESC
LIMIT 20;
```

Dictionary lookups are performed in-place during column projection and are far more cache-friendly than a hash join on large right-hand tables.

For dimension tables with low cardinality (under ~100K rows), use `LAYOUT(FLAT())` which is even faster:

```sql
CREATE DICTIONARY status_dict
(
    status_id   UInt8,
    status_name String
)
PRIMARY KEY status_id
SOURCE(CLICKHOUSE(TABLE status_codes DB 'analytics'))
LAYOUT(FLAT())
LIFETIME(MIN 300 MAX 600);
```

## Filter Before Joining

Push filters as close to the raw tables as possible so the JOIN operates on smaller datasets.

```sql
-- Less efficient: join everything, then filter
SELECT u.country, count()
FROM user_events e
JOIN users u ON e.user_id = u.user_id
WHERE e.event_time >= today() - 7
  AND u.plan_name = 'enterprise';

-- More efficient: filter each side before joining
SELECT u.country, count()
FROM (
    SELECT user_id
    FROM user_events
    WHERE event_time >= today() - 7
) AS e
JOIN (
    SELECT user_id, country
    FROM users
    WHERE plan_name = 'enterprise'
) AS u ON e.user_id = u.user_id;
```

## Use Semi-JOINs and ANY JOIN When Appropriate

When you only need existence checks or one matching row from the right side, use `ANY` or `SEMI` join to avoid materializing all matches.

```sql
-- ANY JOIN: returns one row per left-side row, using the first match from the right side
SELECT
    e.user_id,
    u.plan_name,
    count() AS events
FROM user_events AS e
ANY LEFT JOIN users AS u ON e.user_id = u.user_id
GROUP BY e.user_id, u.plan_name;

-- SEMI JOIN: returns left rows that have at least one match on the right
-- Does not read columns from the right table
SELECT user_id, count() AS events
FROM user_events
WHERE user_id IN (
    SELECT user_id FROM users WHERE plan_name = 'enterprise'
)
GROUP BY user_id;
```

## Join Order Matters in Distributed Queries

On distributed tables, ClickHouse sends the right-hand table to all shards. A large right-hand table creates significant network overhead. Prefer the smaller table on the right, or use `GLOBAL JOIN` to broadcast it once.

```sql
-- Without GLOBAL JOIN: the subquery is re-executed on each shard
SELECT count()
FROM distributed_events
WHERE user_id IN (SELECT user_id FROM users WHERE plan_name = 'enterprise');

-- With GLOBAL IN: the subquery runs once on the initiating node and is broadcast
SELECT count()
FROM distributed_events
WHERE user_id GLOBAL IN (SELECT user_id FROM users WHERE plan_name = 'enterprise');

-- GLOBAL JOIN: right side is evaluated once and sent to all shards
SELECT e.user_id, u.plan_name, count()
FROM distributed_events AS e
GLOBAL JOIN users AS u ON e.user_id = u.user_id
GROUP BY e.user_id, u.plan_name;
```

## Memory Limits for JOINs

Set memory limits to prevent large JOINs from consuming all server RAM:

```sql
SET max_bytes_in_join = 10000000000;  -- 10 GB max for hash table
SET join_overflow_mode = 'throw';     -- throw exception if limit is hit
-- Or: SET join_overflow_mode = 'break'; -- return partial results

-- Enable spilling to disk when memory is exceeded (requires grace_hash algorithm)
SET join_algorithm = 'grace_hash';
SET grace_hash_join_initial_buckets = 32;
```

## Monitoring JOIN Performance

```sql
-- Check how much memory JOIN operations are using
SELECT
    query_id,
    formatReadableSize(memory_usage) AS memory_used,
    query_duration_ms,
    left(query, 100) AS query_snippet
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query ILIKE '%join%'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY memory_usage DESC
LIMIT 10;
```

## Summary

JOIN performance in ClickHouse is driven by: keeping the large table on the left, choosing the right algorithm (`hash` for small right tables, `parallel_hash` for large in-memory joins, `grace_hash` for joins that exceed RAM), replacing dimension JOINs with dictionary lookups, filtering aggressively before the join, and using `GLOBAL JOIN` on distributed setups to avoid redundant network traffic. For repeated dimension lookups, dictionaries with `HASHED` or `FLAT` layouts eliminate join overhead entirely and deliver the best possible lookup performance.
