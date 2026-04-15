# How to Configure MergeTree Settings for Optimal Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Performance, Setting, Configuration, Optimization, SQL

Description: Learn the key MergeTree table settings in ClickHouse that control merge behavior, compression, part size, and query performance for optimal throughput.

---

MergeTree tables expose dozens of settings that control how data parts are stored, merged, compressed, and queried. The defaults work well for most workloads, but tuning a handful of settings can significantly improve write throughput, query latency, and storage efficiency.

## Setting MergeTree Settings at Table Creation

```sql
CREATE TABLE events (
    ts       DateTime,
    user_id  UInt64,
    event    String
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id)
SETTINGS
    index_granularity = 8192,
    min_bytes_for_wide_part = 10485760,
    merge_max_block_size = 8192,
    storage_policy = 'default';
```

## Changing Settings on an Existing Table

Note that some settings like `index_granularity` are immutable after table creation because they define the physical data layout on disk. Only settings that do not affect existing part structure can be modified:

```sql
ALTER TABLE events MODIFY SETTING min_bytes_for_wide_part = 5242880;
ALTER TABLE events MODIFY SETTING parts_to_delay_insert = 500;
```

## Key Settings and Their Effects

### index_granularity

Controls how many rows are indexed per granule. Default: 8192.

```sql
-- Smaller granularity: faster point lookups, more index memory
SETTINGS index_granularity = 4096

-- Larger granularity: fewer index marks, better for wide sequential scans
SETTINGS index_granularity = 16384
```

Lower values reduce the rows scanned for point queries. Higher values reduce index overhead on full-table aggregations.

### min_bytes_for_wide_part

Parts smaller than this threshold use compact format (single file). Parts larger use wide format (one file per column).

```sql
-- 10 MB threshold (default-like)
SETTINGS min_bytes_for_wide_part = 10485760
```

For tables with many columns, compact format saves file descriptor overhead for small parts.

### merge_max_block_size

Maximum number of rows per block during a merge operation. Default: 8192.

```sql
SETTINGS merge_max_block_size = 16384
```

Larger values improve merge throughput for large datasets but increase memory per merge.

### max_parts_in_total

Maximum number of active parts allowed across all partitions.

```sql
SETTINGS max_parts_in_total = 100000
```

If exceeded, inserts are rejected with a "Too many parts" error. Tune this limit for high-frequency insert workloads.

### parts_to_delay_insert / parts_to_throw_insert

Soft and hard limits for insert backpressure per partition:

```sql
SETTINGS parts_to_delay_insert = 150,
         parts_to_throw_insert = 300
```

### ttl_only_drop_parts

When set to 1, TTL drops entire parts rather than rewriting them (more efficient for time-based TTL):

```sql
SETTINGS ttl_only_drop_parts = 1
```

### Column Compression with CODEC

Compression is specified per-column using the `CODEC` clause, not as a table-level setting:

```sql
CREATE TABLE logs (
    ts       DateTime CODEC(Delta, ZSTD(3)),
    message  String CODEC(ZSTD(3))
) ENGINE = MergeTree ORDER BY ts;
```

## Checking Current Table Settings

```sql
SELECT name, value
FROM system.merge_tree_settings
WHERE changed = 1;

-- For a specific table
SELECT engine_full
FROM system.tables
WHERE name = 'events';
```

## Monitoring Merge Activity

```sql
SELECT
    table,
    result_part_name,
    elapsed,
    progress
FROM system.merges
WHERE table = 'events';
```

## Summary

The most impactful MergeTree settings are `index_granularity` (controls point lookup precision), `min_bytes_for_wide_part` (controls part format), `parts_to_delay_insert` and `parts_to_throw_insert` (control insert backpressure), and `ttl_only_drop_parts` (controls TTL efficiency). Start with defaults and tune based on observed query patterns, part counts, and merge queue depth from `system.merges`.
