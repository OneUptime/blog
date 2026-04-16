# How to Configure MergeTree Settings for Optimal Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Performance Tuning, Setting, Table Engine

Description: Learn how to configure key MergeTree table settings in ClickHouse for optimal query and write performance including merge behavior and part limits.

---

## Overview

MergeTree is the foundational table engine in ClickHouse. Its behavior is controlled by numerous settings that affect part management, merge aggressiveness, compression, and query performance. Tuning these settings is essential for production workloads.

## Setting Syntax

MergeTree settings can be defined at table creation time with `SETTINGS`:

```sql
CREATE TABLE my_table
(
    id         UInt64,
    value      String,
    event_time DateTime
)
ENGINE = MergeTree()
ORDER BY (id, event_time)
SETTINGS
    merge_with_ttl_timeout = 86400,
    storage_policy = 'hot_cold';
```

Or altered later:

```sql
ALTER TABLE my_table MODIFY SETTING merge_max_block_size = 8192;
```

## index_granularity

Controls how many rows constitute one granule (index entry). Default is 8192.

```sql
CREATE TABLE events
(
    id         UInt64,
    event_time DateTime,
    data       String
)
ENGINE = MergeTree()
ORDER BY (id, event_time)
SETTINGS index_granularity = 4096;
```

Smaller values improve point lookup performance but increase index size. For time-series scans, 8192 is usually optimal.

## min_rows_for_wide_part / min_bytes_for_wide_part

Parts smaller than this threshold are stored in Compact format (a single data file for all columns) rather than Wide format (one file per column). Wide format is better for large analytical queries.

```sql
SETTINGS
    min_rows_for_wide_part  = 10000,
    min_bytes_for_wide_part = 10485760;  -- 10 MB
```

## merge_max_block_size

The maximum number of rows per merge block. Higher values consume more memory but merge faster.

```sql
SETTINGS merge_max_block_size = 8192;
```

## max_parts_in_total

The maximum number of parts across all partitions before ClickHouse throws a "too many parts" error (default 100,000).

```sql
SETTINGS max_parts_in_total = 100000;
```

If you hit this limit, review your insert frequency and batching strategy.

## Parts Per Partition Limit

```sql
SETTINGS parts_to_delay_insert = 1000,
         parts_to_throw_insert = 3000;
```

- `parts_to_delay_insert`: starts slowing inserts when parts per partition exceed this (default 1000)
- `parts_to_throw_insert`: throws an error when parts per partition exceed this (default 3000)

## TTL Settings

```sql
CREATE TABLE logs
(
    event_time DateTime,
    message    String,
    TTL event_time + INTERVAL 30 DAY
)
ENGINE = MergeTree()
ORDER BY event_time
SETTINGS
    merge_with_ttl_timeout           = 86400,
    ttl_only_drop_parts              = 1;
```

- `merge_with_ttl_timeout`: how often TTL merges are triggered (seconds)
- `ttl_only_drop_parts`: delete whole parts when all rows are expired (faster than row-level deletion)

## Compression Codec Settings

```sql
CREATE TABLE compressed_table
(
    id        UInt64,
    payload   String CODEC(ZSTD(3)),
    timestamp DateTime CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
ORDER BY (id, timestamp);
```

Specify per-column codecs for optimal compression ratios.

## Storage Policy for Tiered Storage

```sql
CREATE TABLE tiered_data
(
    id         UInt64,
    data       String,
    created_at DateTime,
    TTL created_at + INTERVAL 7 DAY TO DISK 'cold_disk'
)
ENGINE = MergeTree()
ORDER BY (id, created_at)
SETTINGS storage_policy = 'hot_cold';
```

Define `hot_cold` policy in `storage_configuration` in `config.xml`.

## Recommended Production Settings Summary

```sql
SETTINGS
    index_granularity             = 8192,
    min_rows_for_wide_part        = 10000,
    min_bytes_for_wide_part       = 10485760,
    parts_to_delay_insert         = 1000,
    parts_to_throw_insert         = 3000,
    max_parts_in_total            = 100000,
    ttl_only_drop_parts           = 1,
    merge_with_ttl_timeout        = 86400;
```

## Summary

MergeTree settings control every aspect of part management, merge behavior, and storage configuration. Key settings include `index_granularity` for query performance, `parts_to_delay_insert`/`parts_to_throw_insert` for write flow control, `ttl_only_drop_parts` for efficient TTL expiry, and `storage_policy` for tiered storage. Always test settings changes on non-production data before applying to critical tables.
