# How to Use CRC32() and CRC64() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, Data Integrity, Deduplication, SQL

Description: Learn how CRC32() and CRC64() provide fast non-cryptographic checksums in ClickHouse for data deduplication, integrity verification, and partition routing.

---

Cyclic Redundancy Check (CRC) functions produce compact numeric fingerprints of string data. Unlike cryptographic hashes such as MD5 or SHA-256, CRC functions are not designed to be collision-resistant under adversarial conditions, but they are extremely fast and sufficient for data integrity checks, change detection, and routing logic. ClickHouse provides `CRC32()` for a 32-bit checksum and `CRC64()` for a 64-bit checksum.

## CRC32()

`CRC32(str)` computes the standard IEEE 802.3 CRC-32 checksum of the input string and returns a `UInt32` value.

```sql
-- Basic CRC32 checksum
SELECT
    CRC32('hello world')  AS hello_checksum,
    CRC32('hello world!') AS different_checksum,
    CRC32('')             AS empty_checksum;
```

```text
hello_checksum | different_checksum | empty_checksum
---------------|--------------------|--------------
222957957      | 62177901           | 0
```

A single character difference produces a completely different checksum. The empty string returns `0`.

## CRC64()

`CRC64(str)` computes a 64-bit CRC checksum and returns a `UInt64`. The larger output space reduces collision probability when hashing large datasets.

```sql
-- CRC64 for wider hash space
SELECT
    CRC64('hello world')  AS crc64_hello,
    CRC32('hello world')  AS crc32_hello;
```

```sql
-- Compare output types
SELECT
    toTypeName(CRC32('test')) AS crc32_type,
    toTypeName(CRC64('test')) AS crc64_type;
```

```text
crc32_type | crc64_type
-----------|----------
UInt32     | UInt64
```

## Detecting Changed Rows (Change Data Capture)

A common pattern is to compute a CRC over all relevant columns to detect whether a row has changed since the last snapshot. This is faster than comparing every column individually.

```sql
-- Build a composite checksum over multiple columns
SELECT
    record_id,
    CRC32(concat(
        toString(status),
        toString(updated_at),
        coalesce(description, '')
    )) AS row_checksum
FROM orders
LIMIT 10;
```

```sql
-- Find rows whose checksum differs between two snapshots
SELECT
    a.record_id,
    a.row_checksum AS old_checksum,
    b.row_checksum AS new_checksum
FROM (
    SELECT record_id, CRC32(concat(toString(status), coalesce(description, ''))) AS row_checksum
    FROM orders_snapshot_yesterday
) AS a
INNER JOIN (
    SELECT record_id, CRC32(concat(toString(status), coalesce(description, ''))) AS row_checksum
    FROM orders_snapshot_today
) AS b ON a.record_id = b.record_id
WHERE a.row_checksum != b.row_checksum;
```

## Deduplicating Rows

CRC can serve as a quick deduplication key when you want to collapse identical records. Because CRC32 has a 32-bit space, use CRC64 for larger datasets to reduce collision risk.

```sql
-- Deduplicate event records by content fingerprint
SELECT
    CRC64(concat(
        toString(user_id),
        event_type,
        toString(event_time)
    )) AS fingerprint,
    any(user_id)   AS user_id,
    any(event_type) AS event_type,
    any(event_time) AS event_time,
    count() AS duplicate_count
FROM raw_events
GROUP BY fingerprint
HAVING duplicate_count > 1
ORDER BY duplicate_count DESC
LIMIT 20;
```

## Partition Routing with Modulo

CRC values are uniformly distributed across their numeric range, making them suitable for deterministic routing. Sharding a logical dataset across N physical destinations is a matter of taking the CRC modulo N.

```sql
-- Route records to one of 8 processing buckets
SELECT
    user_id,
    CRC32(toString(user_id)) % 8 AS processing_bucket
FROM users
LIMIT 10;
```

```sql
-- Count records per bucket to verify uniform distribution
SELECT
    CRC32(toString(user_id)) % 8 AS bucket,
    count() AS records
FROM users
GROUP BY bucket
ORDER BY bucket;
```

Uniform distribution ensures each bucket receives approximately the same workload.

## Checksumming File or Chunk Content

When ingesting chunked files or binary blobs stored as strings, CRC provides a lightweight integrity check.

```sql
-- Store and verify chunk checksums during ingestion
CREATE TABLE file_chunks
(
    file_id    UInt64,
    chunk_seq  UInt32,
    content    String,
    checksum   UInt32
)
ENGINE = MergeTree()
ORDER BY (file_id, chunk_seq);
```

```sql
-- Verify stored checksums match re-computed values
SELECT
    file_id,
    chunk_seq,
    checksum                  AS stored_checksum,
    CRC32(content)            AS computed_checksum,
    checksum = CRC32(content) AS is_valid
FROM file_chunks
WHERE NOT is_valid
LIMIT 100;
```

## Choosing Between CRC32 and CRC64

```text
Metric          | CRC32              | CRC64
----------------|--------------------|-----------------------
Output type     | UInt32 (4 bytes)   | UInt64 (8 bytes)
Hash space      | ~4.3 billion       | ~18.4 quintillion
Collision risk  | Higher             | Much lower
Speed           | Slightly faster    | Slightly slower
Use case        | Small datasets,    | Large datasets,
                | routing/bucketing  | deduplication keys
```

For most deduplication and integrity use cases on datasets with more than a few million rows, `CRC64` is the safer choice.

## Summary

`CRC32()` and `CRC64()` are fast, non-cryptographic checksum functions that return numeric fingerprints of string data. Use `CRC32()` for lightweight bucketing and routing where a 32-bit space is sufficient, and `CRC64()` for deduplication and integrity verification on large datasets where collision avoidance matters. Combine them with `concat()` to fingerprint composite keys and with modulo arithmetic to implement deterministic partition routing.
