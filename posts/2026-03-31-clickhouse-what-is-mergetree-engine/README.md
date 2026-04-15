# What Is a MergeTree Engine and How It Works in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Storage Engine, Primary Index, Partition

Description: Learn what the MergeTree engine is, how it stores and merges data parts, and why it is the foundation of almost every ClickHouse table.

---

MergeTree is the primary storage engine in ClickHouse. Nearly every production table uses MergeTree or one of its variants. Understanding how it works is essential for designing schemas and troubleshooting performance issues.

## What MergeTree Does

MergeTree stores data in immutable sorted chunks called parts. Each INSERT creates one or more new parts. ClickHouse merges smaller parts into larger ones in the background, keeping the number of parts manageable.

```sql
CREATE TABLE events (
  id       UInt64,
  ts       DateTime,
  user_id  UInt32,
  region   LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (region, ts);
```

The `ORDER BY` clause defines the primary sort key. Data within each part is sorted by this key, enabling efficient range scans.

## How Data Is Written

When you insert data, ClickHouse writes a new part directory containing one binary file per column.

```text
/var/lib/clickhouse/data/analytics/events/
  202401_1_1_0/
    id.bin          -- compressed id column data
    ts.bin          -- compressed ts column data
    user_id.bin     -- compressed user_id column data
    region.bin      -- compressed region column data
    primary.idx     -- sparse primary index
    checksums.txt   -- integrity verification
```

Each part directory name encodes the partition, min block number, max block number, and merge level.

## How Merges Work

ClickHouse background merge threads combine small parts into larger ones. Merging:
1. Reads all source parts in sorted order
2. Merges them (like merge sort) maintaining the primary key order
3. Writes a new combined part
4. Removes the old parts after the merge completes

```sql
-- View active parts and their sizes
SELECT partition, name, rows, bytes_on_disk
FROM system.parts
WHERE table = 'events' AND active = 1
ORDER BY partition, name;
```

## The Primary Index

MergeTree keeps a sparse primary index. Instead of indexing every row, it indexes one row per granule (default: every 8,192 rows).

```text
Primary index entry per granule:
[granule_0: (region=EU, ts=2024-01-01)]
[granule_1: (region=EU, ts=2024-01-15)]
[granule_2: (region=US, ts=2024-01-01)]
```

This keeps the index tiny (fits in RAM) while still allowing ClickHouse to skip most granules during a query.

## Partitioning

Partitioning splits data into separate directories by a partition key. ClickHouse can skip entire partitions based on the WHERE clause.

```sql
-- Only reads the 202401 partition directory
SELECT count() FROM events
WHERE toYYYYMM(ts) = 202401;
```

Avoid over-partitioning. Hundreds of thousands of small partitions slow down metadata operations. Monthly partitions are a good default for time-series data.

## MergeTree Variants

MergeTree is the base engine. Variants add specific behaviors:

| Engine | Additional Feature |
|---|---|
| ReplicatedMergeTree | Multi-node replication via ZooKeeper |
| ReplacingMergeTree | Deduplicates by primary key on merge |
| AggregatingMergeTree | Stores aggregate states for incremental aggregation |
| SummingMergeTree | Sums numeric columns on merge |
| CollapsingMergeTree | Collapses row pairs to handle updates |

## Summary

MergeTree writes immutable sorted parts, merges them in the background, and uses a sparse primary index to enable fast range queries. Its partition and sort key design lets ClickHouse skip large amounts of data without reading it. Choosing the right `ORDER BY` and `PARTITION BY` keys is the most important performance decision when creating a ClickHouse table.
