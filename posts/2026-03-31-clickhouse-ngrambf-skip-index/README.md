# How to Use ngrambf_v1 Skip Index in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Skip Index, Ngrambf_v1, Text Search, Index

Description: Learn how to use the ngrambf_v1 skip index in ClickHouse to accelerate substring and LIKE searches on string columns using n-gram bloom filters.

---

## What is ngrambf_v1

`ngrambf_v1` is a skip index that stores a bloom filter of all n-grams (character sequences of length n) from string values in each granule. It helps ClickHouse skip granules that cannot contain a substring match, dramatically speeding up `LIKE`, `notLike`, and `multiSearchAny` queries.

## Create a Table with ngrambf_v1

```sql
CREATE TABLE logs (
    ts DateTime,
    level LowCardinality(String),
    message String,
    INDEX idx_message message TYPE ngrambf_v1(4, 65536, 2, 0) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY ts;
```

Parameters: `ngrambf_v1(n, bloom_filter_size, hash_functions, seed)`

- `n = 4` - length of each n-gram
- `bloom_filter_size = 65536` - bytes per bloom filter block
- `hash_functions = 2` - number of hash functions
- `seed = 0` - random seed

## Insert Sample Data

```sql
INSERT INTO logs VALUES
    ('2026-01-01 10:00:00', 'ERROR', 'Connection refused to database server'),
    ('2026-01-01 10:01:00', 'INFO', 'User login successful'),
    ('2026-01-01 10:02:00', 'ERROR', 'Timeout connecting to upstream service'),
    ('2026-01-01 10:03:00', 'WARN', 'Disk usage above 80 percent');
```

## Query with LIKE

```sql
SELECT ts, level, message
FROM logs
WHERE message LIKE '%Connection%'
ORDER BY ts;
```

ClickHouse uses `ngrambf_v1` to skip granules that cannot contain the substring "Connection".

## Verify Index Usage

```sql
EXPLAIN indexes = 1
SELECT ts, level, message
FROM logs
WHERE message LIKE '%timeout%';
```

Look for index skipping in the output. The bloom filter works on exact n-gram matches so it is case-sensitive by default.

## Case-Insensitive Search

Use `lower()` at index creation time and query time:

```sql
CREATE TABLE logs_ci (
    ts DateTime,
    level LowCardinality(String),
    message String,
    message_lower String MATERIALIZED lower(message),
    INDEX idx_msg_ci message_lower TYPE ngrambf_v1(4, 65536, 2, 0) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY ts;
```

```sql
SELECT ts, message
FROM logs_ci
WHERE message_lower LIKE '%connection%';
```

## Choose the Right n Size

```text
n = 3 (trigrams) - better recall for short substrings, larger false positive rate
n = 4           - good balance for log messages and URLs
n = 5+          - better precision for longer patterns, misses short substrings
```

## Bloom Filter Size Trade-off

Larger `bloom_filter_size` reduces false positives but uses more memory and disk:

```sql
-- Smaller, less precise
INDEX idx_small message TYPE ngrambf_v1(4, 8192, 2, 0) GRANULARITY 1

-- Larger, more precise
INDEX idx_large message TYPE ngrambf_v1(4, 262144, 3, 0) GRANULARITY 1
```

## Summary

The `ngrambf_v1` skip index accelerates substring searches in ClickHouse by storing n-gram bloom filters per granule. Use it on string columns that are frequently searched with `LIKE '%substring%'`. Choose n=4 as a starting point, and tune bloom filter size based on false positive tolerance and available memory.
