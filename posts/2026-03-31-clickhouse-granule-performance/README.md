# What Is Granule in ClickHouse and Why It Matters for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Granule, Performance, Index, Internal

Description: Understand what a granule is in ClickHouse, how the sparse primary index uses granules for query pruning, and how to tune granule size for better performance.

## Introduction

If you have ever read ClickHouse documentation, query plans, or profiling output, you have seen the word "granule" (sometimes "mark"). A granule is the smallest unit of data that ClickHouse reads from disk during a query. Understanding granules is fundamental to understanding ClickHouse query performance.

In short: ClickHouse reads data in chunks called granules (default 8192 rows). Its sparse primary index maps each granule to a single index entry. When you run a query, ClickHouse uses the index to figure out which granules might contain matching data and reads only those. Granules that cannot contain any matching rows are skipped entirely.

## What Is a Granule?

A granule is a contiguous group of rows stored together on disk. The default granule size is 8192 rows, controlled by the `index_granularity` setting. This means:

- A table with 1 million rows has approximately 1,000,000 / 8,192 = 122 granules
- A table with 1 billion rows has approximately 122,000 granules
- The primary index has one entry per granule (122 or 122,000 entries respectively)

```text
Row 0                 <- granule 0 starts here
Row 1
Row 2
...
Row 8191              <- granule 0 ends here
Row 8192              <- granule 1 starts here
...
Row 16383             <- granule 1 ends here
Row 16384             <- granule 2 starts here
```

## How the Sparse Primary Index Uses Granules

The primary index stores one row per granule. For a table with `ORDER BY (sensor_id, recorded_at)`, the index looks like:

```text
Granule 0:  (sensor_id='AAA', recorded_at='2024-01-01 00:00:00')
Granule 1:  (sensor_id='AAA', recorded_at='2024-01-01 22:40:00')
Granule 2:  (sensor_id='BBB', recorded_at='2024-01-02 04:12:00')
Granule 3:  (sensor_id='CCC', recorded_at='2024-01-01 09:00:00')
...
```

When you run `WHERE sensor_id = 'BBB'`, ClickHouse binary-searches the index to find the range of granules that could contain `sensor_id = 'BBB'`, then reads only those granules. Granules before and after the matching range are skipped without reading from disk.

## Seeing Granule Usage in Query Plans

The `EXPLAIN` statement shows how many granules were read:

```sql
EXPLAIN indexes = 1
SELECT avg(temperature)
FROM sensor_readings
WHERE sensor_id = 'S-042'
  AND recorded_at >= '2024-06-01'
  AND recorded_at < '2024-07-01';
```

```text
...
  Indexes:
    PrimaryIndex
      Keys: sensor_id, recorded_at
      Condition: and((sensor_id in ['S-042', 'S-042']), and((recorded_at >= 1717200000), ...))
      Parts: 1/3
      Granules: 4/122
```

`Granules: 4/122` means only 4 out of 122 granules were read. The other 118 were skipped without any disk I/O.

## Using system.query_log to Measure Granules Read

```sql
SELECT
    query,
    read_rows,
    read_bytes,
    ProfileEvents['SelectedMarks']    AS granules_read,
    ProfileEvents['SelectedRanges']   AS ranges_selected
FROM system.query_log
WHERE event_date = today()
  AND type = 'QueryFinish'
ORDER BY granules_read DESC
LIMIT 10;
```

`SelectedMarks` is the number of granules that were actually read. A high ratio of `SelectedMarks` to total granules in the table means the query is not using the index effectively.

## Why Granule Size Matters

The default granule size of 8192 rows is a compromise between:
- **Smaller granules** - finer-grained skipping (skip fewer "extra" rows), but larger index (more memory used)
- **Larger granules** - coarser skipping (read more extra rows), but smaller index (less memory used)

For typical analytical workloads, 8192 is a good default. You might consider changing it in these situations:

**Smaller granules (1024-4096):** Useful when you have extremely selective point-lookup queries and want fine-grained skipping. The trade-off is a larger index.

```sql
CREATE TABLE sensor_readings_fine
(
    sensor_id   LowCardinality(String),
    recorded_at DateTime,
    temperature Float32
)
ENGINE = MergeTree()
ORDER BY (sensor_id, recorded_at)
SETTINGS index_granularity = 4096;
```

**Larger granules (16384-65536):** Useful for large analytical scans where skipping provides little benefit and you want to maximize I/O throughput. The trade-off is coarser pruning.

```sql
CREATE TABLE wide_scan_table
(
    id          UInt64,
    category    LowCardinality(String),
    value       Float64
)
ENGINE = MergeTree()
ORDER BY category
SETTINGS index_granularity = 65536;
```

## Adaptive Granularity

ClickHouse supports adaptive granularity, which adjusts the number of rows per granule so that each granule occupies approximately the same number of bytes (default 10MB). This is useful for tables with variable-length columns (like strings) where a fixed row count per granule results in highly variable granule sizes in bytes.

```sql
CREATE TABLE logs
(
    log_id    UUID,
    logged_at DateTime,
    level     LowCardinality(String),
    message   String
)
ENGINE = MergeTree()
ORDER BY (level, logged_at)
SETTINGS
    index_granularity = 8192,
    index_granularity_bytes = 10485760,  -- 10MB per granule (adaptive)
    enable_mixed_granularity_parts = 1;
```

With adaptive granularity enabled, a granule of short log lines might have 8192 rows, while a granule of very long messages might have only 512 rows - but both will be roughly 10MB on disk.

## Granules and Marks Files

Each column has two files per data part:
- `column_name.bin` - the compressed column data
- `column_name.mrk2` - the marks file, which stores the byte offset of each granule within the `.bin` file

When ClickHouse decides to read granule N of a column, it reads position N from the marks file to find the byte offset, then seeks directly to that offset in the `.bin` file. This is what enables reading individual columns without scanning the entire file.

```text
column_name.mrk2:
  Granule 0: offset 0
  Granule 1: offset 42830
  Granule 2: offset 89112
  ...
```

## Granules and Compression

Compression is applied per compression block, not per granule. A compression block — controlled by `min_compress_block_size` (default 64KB) and `max_compress_block_size` (default 1MB) — typically contains multiple granules, and ClickHouse decompresses the whole block into memory when it needs to read any granule inside it. Compression block size is independent of `index_granularity`, so shrinking granules does not by itself reduce the compression ratio; if you want a better ratio, increase the compression block size settings instead.

Check actual compression ratios:

```sql
SELECT
    column,
    sum(data_compressed_bytes)   AS compressed,
    sum(data_uncompressed_bytes) AS uncompressed,
    round(uncompressed / compressed, 2) AS compression_ratio
FROM system.parts_columns
WHERE table = 'sensor_readings'
  AND active = 1
GROUP BY column
ORDER BY compressed DESC;
```

## Impact of Ordering Key on Granule Efficiency

A well-chosen ordering key clusters related rows together, maximizing the number of granules that can be skipped. Compare these two scenarios for the same query:

```sql
-- Query: SELECT avg(temperature) WHERE sensor_id = 'S-042'

-- Scenario A: ORDER BY (sensor_id, recorded_at)
-- All rows for S-042 are adjacent -> only 2-3 granules need to be read

-- Scenario B: ORDER BY recorded_at
-- S-042 rows are scattered throughout the file -> potentially 100s of granules
```

The ordering key is the most impactful design decision you can make for ClickHouse performance.

## Counting Granules in Your Table

```sql
SELECT
    partition,
    sum(marks)   AS total_granules,
    sum(rows)    AS total_rows,
    round(sum(rows) / sum(marks)) AS avg_rows_per_granule
FROM system.parts
WHERE table = 'sensor_readings'
  AND active = 1
GROUP BY partition
ORDER BY partition;
```

## Conclusion

Granules are the unit of I/O in ClickHouse. The sparse primary index maps one entry per granule, enabling ClickHouse to skip irrelevant granules without reading them from disk. The default granule size of 8192 rows balances index memory usage against query pruning granularity. Choosing an ordering key that clusters query-relevant rows together is the most important optimization for reducing the number of granules read per query.

**Related Reading:**

- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
- [What Is the Difference Between ReplicatedMergeTree and MergeTree](https://oneuptime.com/blog/post/2026-03-31-clickhouse-replicated-vs-mergetree/view)
- [What Is FINAL Keyword and When to Use It in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-final-keyword-guide/view)
