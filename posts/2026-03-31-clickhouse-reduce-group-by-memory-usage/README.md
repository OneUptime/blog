# How to Reduce Memory Usage of GROUP BY in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GROUP BY, Memory, Performance, Query Optimization, Aggregation

Description: Learn how to reduce memory consumption of GROUP BY queries in ClickHouse using overflow modes, two-level aggregation, and schema design strategies.

---

GROUP BY aggregations can consume significant memory in ClickHouse, especially with high-cardinality grouping keys. Understanding how ClickHouse manages aggregation memory and using the right settings can prevent out-of-memory errors and improve throughput.

## How GROUP BY Uses Memory

ClickHouse builds an in-memory hash table for GROUP BY results. Memory usage depends on:
- Number of distinct groups (cardinality)
- Size of each key and aggregation state
- Number of parallel threads

## Monitoring Current GROUP BY Memory

Check memory usage for running queries:

```sql
SELECT
    query_id,
    memory_usage,
    peak_memory_usage,
    read_rows,
    query
FROM system.processes
WHERE query LIKE '%GROUP BY%'
ORDER BY memory_usage DESC;
```

Check historical usage:

```sql
SELECT
    query_id,
    memory_usage,
    ProfileEvents['AggregationHashTablesInitializedAsTwoLevel'] AS two_level,
    query_duration_ms
FROM system.query_log
WHERE query LIKE '%GROUP BY%'
  AND type = 'QueryFinish'
  AND event_date = today()
ORDER BY memory_usage DESC
LIMIT 10;
```

## Setting Group By Overflow Mode

Control what happens when GROUP BY exceeds memory limits:

```sql
-- Throw an error when memory is exceeded (default)
SET max_memory_usage = 10000000000;  -- 10 GB
SET group_by_overflow_mode = 'throw';

-- Drop extra groups beyond the limit instead of throwing
SET max_rows_to_group_by = 1000000;
SET group_by_overflow_mode = 'any';
```

Enable external aggregation to spill to disk:

```sql
-- Spill aggregation state to disk when memory exceeds 5 GB
SET max_bytes_before_external_group_by = 5000000000;
```

## Two-Level Aggregation

ClickHouse automatically switches to a two-level hash table for large aggregations. You can tune the threshold:

```sql
-- Switch to two-level at 100K groups
SET group_by_two_level_threshold = 100000;
SET group_by_two_level_threshold_bytes = 50000000;
```

Two-level aggregation reduces peak memory by processing groups in batches.

## Pre-Filtering to Reduce Cardinality

Reduce the number of groups before aggregating:

```sql
-- Slow: aggregates all users then filters
SELECT user_id, count() AS events
FROM events
GROUP BY user_id
HAVING events > 100;

-- Better: filter early to reduce work
SELECT user_id, count() AS events
FROM events
WHERE event_date >= today() - 7  -- time filter to reduce rows
GROUP BY user_id
HAVING events > 100;
```

## Using Pre-Aggregated Tables

For recurring high-cardinality GROUP BY, use a SummingMergeTree:

```sql
CREATE TABLE url_daily_counts (
    event_date Date,
    url String,
    hit_count UInt64
) ENGINE = SummingMergeTree(hit_count)
ORDER BY (event_date, url);

-- Query without GROUP BY scan
SELECT event_date, url, sum(hit_count) AS hits
FROM url_daily_counts
WHERE event_date = today()
GROUP BY event_date, url
ORDER BY hits DESC
LIMIT 100;
```

## Reducing Key Sizes

Shorter grouping keys use less memory in the hash table:

```sql
-- Avoid grouping by full URLs
SELECT count() FROM events GROUP BY url;

-- Group by a hash of the URL instead
SELECT count(), URLHash(url) AS url_hash FROM events GROUP BY url_hash;

-- Or define columns as LowCardinality in the table schema for repeated values
-- ALTER TABLE events MODIFY COLUMN country LowCardinality(String);
SELECT count() FROM events GROUP BY country;
```

## Parallel Aggregation Settings

Tune parallelism to balance memory across threads:

```sql
-- Reduce threads to lower peak memory (at cost of speed)
SET max_threads = 4;

-- Enable parallel aggregation merging
SET enable_memory_bound_merging_of_aggregation_results = 1;
```

## Summary

Reduce GROUP BY memory in ClickHouse by enabling external group-by spill-to-disk for large aggregations, tuning two-level threshold settings, pre-filtering to reduce group cardinality, using pre-aggregated materialized views for recurring queries, and reducing key sizes with hashing or `LowCardinality` encoding.
