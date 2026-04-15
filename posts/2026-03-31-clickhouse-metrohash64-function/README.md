# How to Use metroHash64() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, MetroHash, Performance, Fingerprinting

Description: Learn how to use metroHash64() in ClickHouse for high-performance 64-bit hashing, row fingerprinting, and change detection pipelines.

---

`metroHash64()` implements the MetroHash algorithm, a fast non-cryptographic hash function designed for high-throughput scenarios. It returns a UInt64 value and accepts multiple arguments of any type. MetroHash was specifically designed to maximize throughput on modern 64-bit hardware, making it one of the fastest options available in ClickHouse for bulk hashing workloads.

## Basic Usage

```sql
-- Hash a single value
SELECT metroHash64('hello world') AS metro_hash;

-- Hash multiple columns
SELECT
    user_id,
    event_type,
    metroHash64(user_id, event_type, toDate(event_time)) AS row_hash
FROM events
LIMIT 10;
```

## Row Fingerprinting

`metroHash64` is well suited for generating a compact fingerprint of an entire row. This is useful for detecting changes between pipeline stages.

```sql
-- Fingerprint each row using all relevant columns
SELECT
    order_id,
    metroHash64(
        order_id,
        customer_id,
        toString(order_total),
        toString(status),
        toString(updated_at)
    ) AS row_fingerprint
FROM orders
LIMIT 20;
```

## Change Detection Between Pipeline Stages

Compare fingerprints of the same records at different pipeline stages to detect unexpected mutations.

```sql
-- Detect rows that changed between ingestion and processing
SELECT
    a.record_id,
    metroHash64(a.raw_value)       AS raw_fingerprint,
    metroHash64(b.processed_value) AS processed_fingerprint
FROM raw_stage AS a
JOIN processed_stage AS b ON a.record_id = b.record_id
WHERE metroHash64(a.raw_value) != metroHash64(b.processed_value)
LIMIT 20;
```

## High-Performance Hashing Pipeline

In pipelines that process billions of rows, metroHash64 minimizes the overhead of hash computation.

```sql
-- Compute hashes for all rows in a large table
SELECT
    event_id,
    metroHash64(event_id, user_id, payload) AS event_hash
FROM large_event_table
WHERE toDate(event_time) = today()
LIMIT 100000;
```

## Bucketing and Partitioning

Use `metroHash64` to assign rows to buckets or partitions in a distributed system.

```sql
-- Assign to 32 buckets
SELECT
    record_id,
    metroHash64(record_id) % 32 AS bucket
FROM records
LIMIT 20;

-- Check bucket distribution
SELECT
    metroHash64(record_id) % 32 AS bucket,
    count()                     AS count
FROM records
GROUP BY bucket
ORDER BY bucket;
```

## Deterministic Sampling

```sql
-- 10% deterministic sample using metroHash64
SELECT
    user_id,
    event_type,
    event_time
FROM events
WHERE metroHash64(user_id) % 10 = 0
LIMIT 1000;
```

## Comparing metroHash64 with Other Hash Functions

```sql
SELECT
    'benchmark'                 AS input,
    metroHash64('benchmark')    AS metro,
    cityHash64('benchmark')     AS city,
    xxHash64('benchmark')       AS xx,
    farmHash64('benchmark')     AS farm;
```

All four functions produce different UInt64 values for the same input. They are all fast for non-cryptographic use cases. Choose based on which algorithm is already in use in your stack.

## Materialized Fingerprint Column

```sql
CREATE TABLE pipeline_records
(
    record_id    UInt64,
    source       String,
    payload      String,
    ingested_at  DateTime,
    row_hash     UInt64 MATERIALIZED metroHash64(record_id, source, payload)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ingested_at)
ORDER BY (source, ingested_at);
```

## Summary

`metroHash64()` is a high-throughput 64-bit hash function optimized for modern hardware. It accepts multiple arguments natively and returns a UInt64. It is ideal for row fingerprinting, change detection, and deterministic bucketing in high-volume data pipelines. Like all non-cryptographic hash functions, it should not be used for security purposes.
