# How to Optimize ClickHouse Queries with Data Skipping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Skipping Index, Skip Index, Query Optimization, Performance

Description: Learn how to use ClickHouse data skipping indexes to speed up queries on non-primary-key columns using minmax, set, and bloom filter index types.

---

ClickHouse data skipping indexes (secondary indexes) allow the engine to skip reading granules when a condition cannot possibly match, based on pre-computed summaries stored per granule.

## Why Data Skipping Indexes

The primary key index only helps for ORDER BY leading columns. Data skipping indexes extend this to arbitrary columns:

```sql
-- Without a skipping index, all granules are read for user_id filter
SELECT count() FROM events WHERE user_id = 'abc123';
```

## Index Types

| Type | Best For | Example |
|---|---|---|
| minmax | Numeric/date ranges | timestamp ranges, IDs |
| set | Low-cardinality equality | status, country |
| bloom_filter | Arbitrary equality, LIKE | user_id strings, IPs |
| ngrambf_v1 | String substring search | log messages, URLs |

## Adding a minmax Index

```sql
ALTER TABLE events
ADD INDEX idx_ts_minmax (ts) TYPE minmax GRANULARITY 1;

ALTER TABLE events MATERIALIZE INDEX idx_ts_minmax;
```

Useful for range queries on columns not in ORDER BY.

## Adding a set Index

```sql
ALTER TABLE events
ADD INDEX idx_event_type (event_type) TYPE set(100) GRANULARITY 4;

ALTER TABLE events MATERIALIZE INDEX idx_event_type;
```

The number in `set(N)` is the max number of unique values per granule to track.

## Adding a bloom_filter Index

```sql
ALTER TABLE events
ADD INDEX idx_user_id (user_id) TYPE bloom_filter(0.01) GRANULARITY 4;

ALTER TABLE events MATERIALIZE INDEX idx_user_id;
```

The parameter `0.01` is the false positive rate.

## Adding an ngrambf_v1 Index for Substring Search

```sql
ALTER TABLE logs
ADD INDEX idx_message_ngram (message) TYPE ngrambf_v1(3, 262144, 2, 0) GRANULARITY 4;
```

Parameters: n-gram size, bloom filter size in bytes, number of hash functions, random seed.

## Testing Index Effectiveness

```sql
EXPLAIN indexes = 1
SELECT count() FROM events WHERE user_id = 'abc123';
```

Before index: all granules read.
After bloom_filter index: only granules where `user_id` might match are read.

## Verifying Index Materialization

```sql
SELECT
    name, type, expr, granularity
FROM system.data_skipping_indices
WHERE table = 'events';
```

## Index Overhead

Data skipping indexes increase storage and insert overhead. Measure before adding:

```sql
SELECT
    name, data_compressed_bytes, marks_bytes
FROM system.parts
WHERE table = 'events' AND active
LIMIT 5;
```

## Summary

ClickHouse data skipping indexes allow granule-level skipping for non-primary-key columns. Choose the index type based on your filter pattern: minmax for ranges, set for low-cardinality equality, bloom_filter for high-cardinality equality, and ngrambf_v1 for substring matching.
