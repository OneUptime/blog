# How to Use xxHash32() and xxHash64() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, xxHash, Performance, Sampling

Description: Learn how to use xxHash32() and xxHash64() in ClickHouse for extremely fast non-cryptographic hashing, row fingerprinting, and consistent sampling.

---

xxHash is one of the fastest non-cryptographic hash algorithms available. ClickHouse provides two variants: `xxHash32()` returns a UInt32 value, and `xxHash64()` returns a UInt64 value. Both accept one or more arguments of any data type and are optimized for raw throughput. They are ideal for high-volume row hashing, consistent sampling, and partition assignment where speed is the primary concern.

## Basic Usage

```sql
-- 32-bit hash returns a UInt32
SELECT xxHash32('hello world') AS hash32;

-- 64-bit hash returns a UInt64
SELECT xxHash64('hello world') AS hash64;

-- Hash a column value
SELECT
    event_id,
    xxHash64(event_id) AS event_hash
FROM events
LIMIT 10;
```

## High-Throughput Row Hashing

`xxHash64` is well suited for pipelines that need to hash millions of rows quickly. It outperforms MD5 and SHA functions by a large margin for non-cryptographic use cases.

```sql
-- Hash a composite key from multiple columns
SELECT
    user_id,
    session_id,
    xxHash64(user_id, session_id, event_time) AS row_fingerprint
FROM user_events
LIMIT 20;
```

Note: `xxHash32` and `xxHash64` accept multiple arguments of any data type, so you can pass columns directly without concatenation.

## Consistent Sampling

Because `xxHash64` is deterministic, it enables reproducible sampling. The same rows are selected every time, making it useful for reproducible experiments.

```sql
-- Sample exactly 10% of rows (deterministic)
SELECT
    user_id,
    event_type,
    event_time
FROM events
WHERE xxHash64(toString(user_id)) % 10 = 0
LIMIT 1000;

-- Sample 1% for quick aggregations on large tables
SELECT
    event_type,
    count() * 100 AS estimated_total
FROM events
WHERE xxHash64(toString(user_id)) % 100 = 0
GROUP BY event_type
ORDER BY estimated_total DESC;
```

## Partition Assignment

`xxHash32` is useful for assigning rows to partitions or buckets in custom partitioning schemes.

```sql
-- Assign rows to one of 16 partitions
SELECT
    record_id,
    xxHash32(toString(record_id)) % 16 AS partition_bucket
FROM records
LIMIT 20;
```

## Change Detection

Compare the hash of a row's content before and after processing to detect modifications.

```sql
-- Detect rows that changed between two versions of a dataset
SELECT
    a.record_id,
    xxHash64(a.payload) AS old_hash,
    xxHash64(b.payload) AS new_hash,
    xxHash64(a.payload) != xxHash64(b.payload) AS changed
FROM dataset_v1 AS a
JOIN dataset_v2 AS b ON a.record_id = b.record_id
WHERE changed = 1
LIMIT 20;
```

## Comparing xxHash32 and xxHash64

```sql
-- Compare the two variants
SELECT
    'benchmark input'                AS input,
    xxHash32('benchmark input')      AS xx32,
    xxHash64('benchmark input')      AS xx64;
```

Use `xxHash32` when you need a smaller output (UInt32) for memory-constrained applications. Use `xxHash64` for better distribution and lower collision probability when hashing large datasets.

## Using xxHash64 as a Materialized Column

```sql
CREATE TABLE event_stream
(
    event_id    String,
    user_id     UInt64,
    payload     String,
    event_time  DateTime,
    payload_hash UInt64 MATERIALIZED xxHash64(payload)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);
```

## Performance Comparison

```sql
-- Compare hash function performance (run on a large table)
SELECT
    count(cityHash64(payload))  AS city_hashed,
    count(xxHash64(payload))    AS xx_hashed,
    count(MD5(payload))         AS md5_hashed
FROM large_events;
```

In practice, `xxHash64` and `cityHash64` are both extremely fast and the difference is usually negligible at the query level. Benchmarks on raw throughput show xxHash as one of the fastest available algorithms.

## Summary

`xxHash32()` and `xxHash64()` are among ClickHouse's fastest hash functions. They accept one or more arguments of any data type, so multi-column hashing can be done by passing columns directly. Use `xxHash64` for consistent sampling, fingerprinting, and change detection in high-throughput pipelines. Use `xxHash32` when a compact UInt32 output is preferred. Neither is suitable for cryptographic applications.
