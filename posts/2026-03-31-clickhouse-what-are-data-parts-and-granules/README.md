# What Are Data Parts and Granules in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Part, Granule, MergeTree, Primary Index

Description: Understand what data parts and granules are in ClickHouse, how they relate to the primary index, and how they affect query performance.

---

Data parts and granules are the core storage primitives in ClickHouse. Understanding them explains how ClickHouse achieves fast scans while minimizing I/O.

## What Is a Data Part?

A data part is an immutable directory on disk created by each INSERT into a MergeTree table. It contains one binary file per column, a sparse primary index, and checksums.

```text
/var/lib/clickhouse/data/mydb/events/
  20240101_1_1_0/        <- partition=20240101, block 1 to 1, merge level 0
    id.bin
    ts.bin
    revenue.bin
    primary.idx
    checksums.txt
  20240101_2_2_0/        <- second insert, not yet merged
    ...
  20240101_1_2_1/        <- merged part combining blocks 1 and 2
    ...
```

After a merge, old parts are removed and replaced by the merged part. Active parts are those not yet superseded by a merge.

```sql
-- Count active parts per table
SELECT table, count() AS active_parts
FROM system.parts
WHERE active = 1
GROUP BY table;
```

## What Is a Granule?

A granule is the smallest unit of data that ClickHouse reads from disk. By default, each granule contains 8,192 rows. ClickHouse never reads a partial granule - it always reads whole granules at a time.

```text
Part with 24,576 rows = 3 granules
Granule 0: rows 0-8191
Granule 1: rows 8192-16383
Granule 2: rows 16384-24575
```

The primary index has one entry per granule. This is what makes the index sparse and small enough to keep entirely in RAM.

## How the Primary Index Uses Granules

When you query with a WHERE clause on the sort key, ClickHouse uses the primary index to find which granules might contain matching rows and skips the rest.

```sql
-- Table is ordered by (region, ts)
SELECT count() FROM events
WHERE region = 'US' AND ts BETWEEN '2024-01-01' AND '2024-01-31';
```

ClickHouse binary searches the primary index for the first granule where `region >= 'US'` and the last granule where `region <= 'US'`. It reads only those granules from the `region.bin` and `ts.bin` files, skipping all others.

## Adjusting Granule Size

The default granule size is 8,192 rows. You can adjust it per table:

```sql
CREATE TABLE events (
  id UInt64,
  ts DateTime,
  revenue Float64
) ENGINE = MergeTree()
ORDER BY ts
SETTINGS index_granularity = 4096;  -- smaller granules, larger index
```

Smaller granules mean a larger primary index and more precise skipping, but more metadata overhead. Larger granules reduce index size but read more rows per granule.

## Too Many Parts Problem

When inserts are too frequent and small, the number of active parts grows faster than background merges can reduce them. ClickHouse throttles inserts and eventually returns an error.

```sql
-- Check if any table has too many parts
SELECT table, count() AS parts
FROM system.parts
WHERE active = 1
GROUP BY table
HAVING parts > 300
ORDER BY parts DESC;
```

Always batch inserts to produce fewer, larger parts.

## Summary

Data parts are immutable on-disk chunks created by inserts and merged over time. Granules are the fixed-size read units (default 8,192 rows) that the sparse primary index maps to. ClickHouse skips granules at query time by searching the primary index, reading only the data ranges that could match the query. Keeping part counts low and choosing the right sort key are the most important factors for read performance.
