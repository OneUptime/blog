# How to Use bloom_filter Skip Index in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bloom Filter, Skip Index, Query Optimization, Performance

Description: Learn how to create and use bloom_filter skip indexes in ClickHouse to speed up equality and IN-set queries on non-primary-key columns.

---

## What Is a Bloom Filter Skip Index

A skip index in ClickHouse allows the query engine to skip reading entire data granules that cannot contain matching rows. The `bloom_filter` skip index type stores a probabilistic data structure (Bloom filter) per granule that records which values are present.

When a query filters on a bloom-filtered column, ClickHouse checks the index to skip granules that definitely do not contain the requested value, reducing I/O significantly.

## Creating a Table with bloom_filter Skip Index

```sql
CREATE TABLE access_log (
    ts          DateTime,
    user_id     UInt64,
    session_id  String,
    url         String,
    status_code UInt16,

    INDEX idx_session_id session_id TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_url        url        TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = MergeTree()
ORDER BY (ts, user_id);
```

The `0.01` is the false positive rate (1%). Lower values use more memory but reduce false positives.

## Granularity Setting

The `GRANULARITY` parameter controls how many primary key index granules are covered by one skip index granule:

- `GRANULARITY 1` - one skip index entry per primary key granule (most precise, more index size)
- `GRANULARITY 4` - one skip index entry per 4 primary key granules (less precise, smaller index)

```sql
CREATE TABLE events (
    ts          DateTime,
    event_id    String,
    source_ip   String,

    INDEX idx_event_id  event_id  TYPE bloom_filter(0.005) GRANULARITY 2,
    INDEX idx_source_ip source_ip TYPE bloom_filter(0.01)  GRANULARITY 8
) ENGINE = MergeTree()
ORDER BY ts;
```

## Adding a bloom_filter Index to an Existing Table

```sql
ALTER TABLE access_log
    ADD INDEX idx_session_id session_id TYPE bloom_filter(0.01) GRANULARITY 4;

-- Materialize the index on existing data
ALTER TABLE access_log MATERIALIZE INDEX idx_session_id;
```

## Queries That Benefit from bloom_filter

Equality checks and IN lists are the primary beneficiaries:

```sql
-- Point lookup by session_id
SELECT * FROM access_log
WHERE session_id = 'abc123def456'
LIMIT 10;

-- IN-set query
SELECT count() FROM access_log
WHERE session_id IN ('abc123', 'def456', 'ghi789');

-- Equality check on a string column
SELECT * FROM access_log
WHERE url = '/api/v1/login';
```

## Checking If the Index Is Being Used

```sql
-- Enable trace logging to see index usage
SET send_logs_level = 'trace';

SELECT count() FROM access_log
WHERE session_id = 'abc123';

-- Or check EXPLAIN
EXPLAIN indexes = 1
SELECT count() FROM access_log
WHERE session_id = 'abc123';
```

## tokenbf_v1 for Token-Based Lookups

For substring searches on strings, use `tokenbf_v1` instead:

```sql
CREATE TABLE logs (
    ts      DateTime,
    message String,

    INDEX idx_message message TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
ORDER BY ts;

-- This can skip granules for token searches
SELECT * FROM logs
WHERE hasToken(message, 'ERROR');
```

## Dropping a Skip Index

```sql
ALTER TABLE access_log
    DROP INDEX idx_session_id;
```

## Monitoring Skip Index Effectiveness

```sql
SELECT
    query_id,
    read_rows,
    read_bytes,
    result_rows,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%access_log%'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 5;
```

Compare `read_rows` to `result_rows` to see how effectively granules are being skipped.

## bloom_filter for Array Columns

Bloom filters also work with array columns using `hasAny` or `has`:

```sql
CREATE TABLE user_tags (
    user_id UInt64,
    tags    Array(String),

    INDEX idx_tags tags TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = MergeTree()
ORDER BY user_id;

-- Query using the index
SELECT user_id FROM user_tags
WHERE has(tags, 'premium');
```

## Summary

The `bloom_filter` skip index in ClickHouse provides probabilistic pruning for equality and IN-set queries on non-primary-key columns, often reducing I/O by 10-100x on selective queries. Create it with an appropriate false positive rate (0.01 is a good default), materialize it on existing data with `MATERIALIZE INDEX`, and verify effectiveness using `EXPLAIN indexes = 1`. Use `tokenbf_v1` for token-based string searches and `bloom_filter` on array columns for `has()` queries.
