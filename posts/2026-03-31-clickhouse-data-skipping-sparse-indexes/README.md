# How to Use Data Skipping with Sparse Indexes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SparseIndex, SkipIndex, MergeTree, Performance, Query

Description: Learn how ClickHouse sparse primary indexes and data-skipping indexes work together to prune granules, reduce I/O, and accelerate analytical queries.

---

ClickHouse's query performance advantage over traditional databases comes largely from its ability to skip reading irrelevant data at multiple levels. The primary mechanism is the sparse index, which is the primary key index, combined with data-skipping secondary indexes. Understanding how these layers interact helps you design schemas and queries that read fractions of the data that a full scan would touch.

## The Sparse Index Architecture

ClickHouse stores column data in contiguous sorted files called parts. Each part is divided into granules of 8192 rows (default). The sparse primary index stores one entry per granule, recording the `ORDER BY` key value at the start of that granule.

```text
Granule 0:  rows   0-8191    index entry: (domain='aaa.com', ts='2024-01-01 00:00:00')
Granule 1:  rows 8192-16383  index entry: (domain='bbb.com', ts='2024-01-01 01:20:00')
Granule 2:  rows 16384-24575 index entry: (domain='bbb.com', ts='2024-01-02 10:00:00')
...
```

A query `WHERE domain = 'bbb.com'` uses the sparse index to find the first and last granule that could contain `bbb.com`, reading only those granules and skipping everything outside the range.

## Granule Anatomy

```sql
-- Check the granule configuration for a table
SELECT
    name,
    create_table_query
FROM system.tables
WHERE name = 'http_logs'
  AND database = currentDatabase();

-- Global MergeTree defaults for granularity settings
SELECT name, value
FROM system.merge_tree_settings
WHERE name IN ('index_granularity', 'index_granularity_bytes');
```

## Why "Sparse"

A dense index would store one entry per row, requiring gigabytes of index memory for large tables. A sparse index stores one entry per 8192 rows. For a 1 billion-row table:

- Dense index: ~8GB+ (at 8 bytes per key)
- Sparse index: ~1MB (at the same key size)

The sparse index fits entirely in memory and can be binary-searched in microseconds.

## Layer 1: Primary Key Pruning

```sql
CREATE TABLE http_logs
(
    domain  String,
    status  UInt16,
    bytes   UInt64,
    ts      DateTime
)
ENGINE = MergeTree()
ORDER BY (domain, ts);

-- Insert test data
INSERT INTO http_logs
SELECT
    ['a.com','b.com','c.com'][1 + rand() % 3],
    [200, 301, 404, 500][1 + rand() % 4],
    rand() % 100000,
    toDateTime('2024-01-01') + rand() % 2592000
FROM numbers(10000000);
```

Query with primary key filter:

```sql
EXPLAIN indexes = 1
SELECT sum(bytes)
FROM http_logs
WHERE domain = 'a.com'
  AND ts > '2024-01-15';
```

Expected: reads only granules within the `a.com` data range.

## Layer 2: Skip Index Pruning

Within the granules selected by the primary index, a skip index can further prune:

```sql
ALTER TABLE http_logs
    ADD INDEX idx_status status TYPE set(10) GRANULARITY 4;

ALTER TABLE http_logs MATERIALIZE INDEX idx_status;
```

Now run:

```sql
EXPLAIN indexes = 1
SELECT sum(bytes)
FROM http_logs
WHERE domain = 'a.com'
  AND ts > '2024-01-15'
  AND status = 500;
```

The output shows two pruning stages:

```text
PrimaryKey:  Granules: 150/1000
Skip idx_status: Granules: 22/150
```

The primary index reduced from 1000 to 150, and the skip index further reduced to 22.

## Layer 3: Partition Pruning

Partition keys provide a third layer of pruning at the part level:

```sql
CREATE TABLE http_logs_partitioned
(
    domain  String,
    status  UInt16,
    bytes   UInt64,
    ts      DateTime,

    INDEX idx_status status TYPE set(10) GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (domain, ts);
```

A query with `ts >= '2024-03-01' AND ts < '2024-04-01'` reads only the `202403` partition. ClickHouse does not even open parts in other partitions.

```sql
EXPLAIN indexes = 1
SELECT count()
FROM http_logs_partitioned
WHERE ts >= '2024-03-01'
  AND ts < '2024-04-01'
  AND domain = 'a.com'
  AND status = 404;
```

## Measuring the Combined Effect

Before optimization (no partition, no skip index):

```sql
SELECT sum(bytes) FROM http_logs WHERE domain = 'a.com' AND status = 500;
-- Reads: all granules
```

After optimization (partition + skip index):

```sql
SELECT sum(bytes) FROM http_logs_partitioned
WHERE ts >= '2024-01-01' AND ts < '2024-02-01'
  AND domain = 'a.com' AND status = 500;
-- Reads: partition filter + primary key + skip index
```

Compare using query log:

```sql
SELECT read_rows, read_bytes, query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Adaptive Granularity

ClickHouse also supports adaptive granularity (enabled by default), which adjusts granule size to keep each granule at approximately a fixed byte size:

```sql
CREATE TABLE http_logs_adaptive
(
    domain String,
    ts     DateTime
)
ENGINE = MergeTree()
ORDER BY (domain, ts)
SETTINGS index_granularity_bytes = 10485760,  -- target bytes per granule (default 10 MiB)
         index_granularity = 8192;             -- max rows per granule (default)
```

With adaptive granularity, wide rows get smaller granules (more precise index) and narrow rows get larger granules (smaller index file).

## Sparse Index Memory Usage

```sql
SELECT
    table,
    formatReadableSize(sum(primary_key_bytes_in_memory)) AS index_ram,
    sum(marks) AS granules,
    sum(rows)  AS rows
FROM system.parts
WHERE active = 1
  AND table = 'http_logs'
  AND database = currentDatabase()
GROUP BY table;
```

The sparse index should use kilobytes to a few megabytes even for billion-row tables.

## Index Pruning Strategy Summary

```text
Partition key  -> eliminates entire partitions (largest chunks)
Primary index  -> eliminates granules not in the sorted key range
Skip indexes   -> eliminates granules within remaining range
```

Together these three layers can reduce data read from 100% to under 1% for selective queries.

## Practical Recommendations

1. Always include a time column in the primary key or partition key
2. Put the highest-cardinality filter column first in `ORDER BY`
3. Add `minmax` skip indexes for numeric range filters outside the key
4. Add `set` skip indexes for low-cardinality equality filters
5. Add `bloom_filter` skip indexes for high-cardinality string equality filters
6. Verify all three layers with `EXPLAIN indexes = 1`

## Summary

ClickHouse's data-skipping architecture combines partition pruning, sparse primary index lookups, and skip index scans into a multi-layer pruning pipeline. Each layer operates on increasingly fine granularity. Designing tables with this architecture in mind, and validating with `EXPLAIN indexes = 1`, is the path to analytical queries that complete in milliseconds on terabyte-scale tables.
