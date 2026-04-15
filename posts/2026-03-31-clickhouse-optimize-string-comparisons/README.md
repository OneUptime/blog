# How to Optimize String Comparisons in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String, Performance, LowCardinality, Index, Query Optimization

Description: Learn how to optimize string comparisons in ClickHouse using LowCardinality types, bloom filter indexes, and avoiding full string scans with proper data modeling.

---

String comparisons are among the most expensive operations in analytical databases. ClickHouse provides several tools to make string filtering fast: `LowCardinality` encoding, bloom filter skip indexes, and careful use of string functions.

## The Cost of String Comparisons

Without optimization, ClickHouse must compare raw bytes for every row. This is slow for:
- High-cardinality string columns (URLs, error messages)
- LIKE patterns that cannot use indexes
- String functions like `lower()`, `trim()` in WHERE clauses

## Using LowCardinality for Repeated Strings

`LowCardinality(String)` stores a dictionary of unique values and uses integer codes internally. Equality comparisons become integer comparisons:

```sql
-- Without LowCardinality
CREATE TABLE events_slow (
    event_type String,
    country String,
    device_type String,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);

-- With LowCardinality
CREATE TABLE events_fast (
    event_type LowCardinality(String),
    country LowCardinality(String),
    device_type LowCardinality(String),
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);
```

Equality filters on `LowCardinality` columns use dictionary lookups instead of byte-by-byte comparison:

```sql
-- This is fast with LowCardinality
SELECT count() FROM events_fast WHERE event_type = 'purchase';
```

## Bloom Filter Index for High-Cardinality Strings

For high-cardinality strings (user agents, error messages), add a bloom filter skip index:

```sql
CREATE TABLE logs (
    log_time DateTime,
    level String,
    message String,
    INDEX message_bloom_idx message TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = MergeTree()
ORDER BY (log_time);
```

The bloom filter allows ClickHouse to skip granules that definitely do not contain a value:

```sql
-- Bloom filter can skip irrelevant granules
SELECT * FROM logs WHERE message = 'Connection refused';
```

## Avoiding Functions in WHERE Clauses

Functions on string columns prevent index usage:

```sql
-- Slow: function prevents index/bloom filter usage
SELECT * FROM logs WHERE lower(level) = 'error';

-- Fast: store as lowercase, filter directly
SELECT * FROM logs WHERE level = 'error';

-- Or: store normalized value at insert time
INSERT INTO logs SELECT log_time, lower(level), message FROM raw_logs;
```

## Using startsWith Instead of LIKE

For prefix matching, `startsWith` is faster than `LIKE` with a prefix wildcard:

```sql
-- Works but less explicit: ClickHouse can optimize prefix LIKE
SELECT * FROM urls WHERE path LIKE '/api/%';

-- Preferred: startsWith is explicit and always optimized
SELECT * FROM urls WHERE startsWith(path, '/api/');
```

For prefix filters on ORDER BY columns, use range conditions:

```sql
-- Fastest for primary key column: range scan
SELECT * FROM urls
WHERE path >= '/api/' AND path < '/api0';
```

## N-gram Bloom Filter for LIKE Searches

For arbitrary substring searches, use `ngrambf_v1` which splits text into character-level n-grams:

```sql
CREATE TABLE search_index (
    doc_id UInt64,
    content String,
    INDEX content_ngram_idx content TYPE ngrambf_v1(4, 32768, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
ORDER BY doc_id;

-- N-gram bloom filter can skip non-matching granules
SELECT doc_id FROM search_index WHERE content LIKE '%clickhouse%';
```

For whole-word matching (where terms are separated by non-alphanumeric characters), use `tokenbf_v1` instead:

```sql
INDEX content_token_idx content TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4
```

## Comparing String Performance

Benchmark the improvement:

```sql
-- Check marks read with and without index
SELECT
    ProfileEvents['SelectedMarks'] AS marks_read,
    read_rows,
    query_duration_ms
FROM system.query_log
WHERE query LIKE '%logs%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Summary

Optimize string comparisons in ClickHouse by using `LowCardinality` for repeated values (under ~10K unique values), adding bloom filter skip indexes for high-cardinality equality lookups, normalizing strings at insert time to avoid function calls in WHERE clauses, and using `startsWith` or range conditions instead of `LIKE` for prefix matching.
