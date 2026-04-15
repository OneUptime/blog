# What Is ClickHouse MergeTree and How It Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Storage Engine, Internal, Database

Description: Learn how ClickHouse MergeTree works internally, including data parts, primary keys, sorting keys, sparse indexes, and background merges that make it fast.

## Introduction

MergeTree is the most important storage engine in ClickHouse. Almost every production ClickHouse table uses MergeTree or one of its variants (ReplacingMergeTree, SummingMergeTree, AggregatingMergeTree, CollapsingMergeTree, etc.). Understanding how MergeTree works internally is essential for designing schemas that are fast, storage-efficient, and easy to maintain.

This post explains the internals of MergeTree from the ground up: how data is written, how it is stored on disk, how the primary index works, and how background merges keep the table healthy.

## What Makes MergeTree Different

MergeTree is a column-oriented storage engine designed for append-heavy analytical workloads. It makes several trade-offs that differ from row-oriented databases:

- **No row-level updates or deletes at write time** - all writes are appends
- **Background merges, not in-place modifications** - data is reorganized asynchronously
- **Sparse primary index** - indexes one row per granule, not every row
- **Column-level compression** - each column is stored and compressed separately

These trade-offs give MergeTree extremely high write throughput and very efficient analytical read performance at the cost of making updates and deletes complex.

## Creating a MergeTree Table

```sql
CREATE TABLE sensor_readings
(
    sensor_id   LowCardinality(String),
    recorded_at DateTime,
    temperature Float32,
    humidity    Float32,
    pressure    Float32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (sensor_id, recorded_at);
```

The key clauses are:
- `ENGINE = MergeTree()` - specifies the storage engine
- `PARTITION BY` - controls how data is split across disk directories
- `ORDER BY` - defines both the sorting key and the primary key (by default)

## How Data Is Written: Parts

When you insert rows into a MergeTree table, ClickHouse does not write them into an existing file. Instead, each `INSERT` creates a new **data part** on disk. A data part is a directory containing one file per column plus an index file.

```text
/var/lib/clickhouse/data/mydb/sensor_readings/
  202401_1_1_0/       <- data part (partition 202401)
    sensor_id.bin     <- compressed column data
    recorded_at.bin
    temperature.bin
    humidity.bin
    pressure.bin
    primary.idx       <- sparse primary index
    minmax_recorded_at.idx  <- min/max index for partition pruning
  202401_2_2_0/       <- another data part from a second INSERT
  202401_1_2_1/       <- merged part combining 202401_1_1_0 and 202401_2_2_0
```

The naming convention `<partition_id>_<min_block>_<max_block>_<merge_level>` encodes the partition, the range of data blocks, and how many times this part has been merged. When there is no `PARTITION BY` clause, the partition ID defaults to `all`.

## The Sorting Key and Why It Matters

The `ORDER BY` clause defines the sorting key. ClickHouse sorts all data within a part by this key before writing it to disk. This has two important consequences:

1. **Efficient range scans** - queries with `WHERE sensor_id = 'S-001' AND recorded_at BETWEEN ...` can skip most of the data because matching rows are physically adjacent
2. **Better compression** - sorted data compresses much better than random data because adjacent values are similar

Choose your sorting key based on the most common query filters. Put the lowest-cardinality column first (the column with fewer distinct values), then higher-cardinality columns:

```sql
-- Good: low cardinality first, then time
ORDER BY (region, sensor_type, sensor_id, recorded_at)

-- Less efficient: high cardinality UUID first
ORDER BY (uuid, recorded_at)
```

## The Sparse Primary Index

The primary index in MergeTree is **sparse** - it does not index every row. Instead, it indexes one row per **granule** (a block of rows, default 8192 rows).

When you query with a filter on the primary key prefix, ClickHouse:
1. Reads the primary index into memory (it is small because it only covers one row per 8192)
2. Uses binary search to find which granules could contain matching data
3. Reads only those granules from disk

```text
Primary index for ORDER BY (sensor_id, recorded_at):

Index entry 0:  (sensor_id='A', recorded_at='2024-01-01 00:00:00')
Index entry 1:  (sensor_id='A', recorded_at='2024-01-01 22:40:00')  <- row 8192
Index entry 2:  (sensor_id='B', recorded_at='2024-01-01 01:12:00')  <- row 16384
...
```

A query for `WHERE sensor_id = 'A' AND recorded_at = '2024-01-01 10:00:00'` can use binary search to skip to the correct range of granules.

## Checking Index Usage with EXPLAIN

```sql
EXPLAIN indexes = 1
SELECT avg(temperature)
FROM sensor_readings
WHERE sensor_id = 'S-001'
  AND recorded_at >= '2024-01-01'
  AND recorded_at < '2024-02-01';
```

The output shows how many granules were read vs skipped. Fewer granules read means faster queries.

## Partition Pruning

The `PARTITION BY` clause splits data into separate directories per partition. Queries that filter on the partition key never touch partitions outside the filter range:

```sql
-- This query only touches the 202401 partition directory
SELECT avg(temperature)
FROM sensor_readings
WHERE toYYYYMM(recorded_at) = 202401;
```

Good partition keys are usually based on time (month, year) or a low-cardinality categorical column. Avoid high-cardinality partition keys because they create too many tiny directories.

```sql
-- Good: monthly partitioning
PARTITION BY toYYYYMM(recorded_at)

-- Good: by region and month
PARTITION BY (region, toYYYYMM(recorded_at))

-- Bad: by user_id (millions of partitions)
PARTITION BY user_id
```

## Background Merges

ClickHouse runs background merge threads that combine small parts into larger parts. This process:
1. Reads multiple parts into memory
2. Merges and sorts the data
3. Writes a new larger part
4. Deletes the old smaller parts

Merges serve several purposes: they reduce the number of files on disk (fewer files means faster queries), they apply deduplication logic in ReplacingMergeTree, they collapse rows in CollapsingMergeTree, and they apply TTL deletions.

You can check the current parts and their merge status:

```sql
SELECT
    partition,
    name,
    rows,
    data_compressed_bytes,
    data_uncompressed_bytes,
    marks,
    level
FROM system.parts
WHERE table = 'sensor_readings'
  AND active = 1
ORDER BY partition, name;
```

## Secondary Indexes (Skip Indexes)

In addition to the sparse primary index, you can add skip indexes that allow ClickHouse to skip granules that do not match a filter:

```sql
ALTER TABLE sensor_readings
    ADD INDEX temp_idx (temperature) TYPE minmax GRANULARITY 4;
```

Available skip index types:
- `minmax` - stores min and max value per range of granules; useful for range predicates
- `set(N)` - stores up to N distinct values per range; useful for equality predicates
- `bloom_filter` - probabilistic membership test; useful for string equality and IN predicates
- `tokenbf_v1` - bloom filter for tokenized text; useful for substring searches

## Configuring MergeTree

Key MergeTree settings:

```sql
CREATE TABLE sensor_readings
(
    sensor_id   LowCardinality(String),
    recorded_at DateTime,
    temperature Float32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (sensor_id, recorded_at)
SETTINGS
    index_granularity = 8192,           -- rows per granule (default)
    merge_max_block_size = 8192,        -- rows per block during merge
    min_bytes_for_wide_part = 10485760; -- use wide format above 10MB
```

## Wide vs Compact Parts

Small inserts create **compact parts** where all columns are stored together. Once a part grows above `min_bytes_for_wide_part`, it becomes a **wide part** where each column is in its own file. Wide parts are better for queries that only read a few columns.

```sql
-- Check part format
SELECT name, part_type, rows, data_compressed_bytes
FROM system.parts
WHERE table = 'sensor_readings' AND active = 1;
```

## Conclusion

MergeTree is the foundation of ClickHouse's analytical performance. Its append-only write model, sparse primary index, partition pruning, and background merge process work together to deliver fast ingest and fast queries simultaneously. Choosing the right `ORDER BY` and `PARTITION BY` keys for your query patterns is the single most impactful optimization you can make when designing a ClickHouse schema.

**Related Reading:**

- [What Is the Difference Between ReplicatedMergeTree and MergeTree](https://oneuptime.com/blog/post/2026-03-31-clickhouse-replicated-vs-mergetree/view)
- [What Is Granule in ClickHouse and Why It Matters for Performance](https://oneuptime.com/blog/post/2026-03-31-clickhouse-granule-performance/view)
- [What Is CollapsingMergeTree and When to Use It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-collapsingmergetree-guide/view)
