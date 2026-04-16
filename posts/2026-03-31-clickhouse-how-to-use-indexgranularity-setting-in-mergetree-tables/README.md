# How to Use index_granularity Setting in MergeTree Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, index_granularity, Performance, Indexing

Description: Learn how the index_granularity setting controls ClickHouse MergeTree sparse index granules and how to tune it for optimal query and storage performance.

---

## Overview

`index_granularity` is one of the most important MergeTree settings. It defines the number of rows per granule - the basic unit of ClickHouse's sparse primary index. Every `index_granularity` rows, ClickHouse stores one index mark. This setting controls the trade-off between index precision (faster point lookups) and index size (less memory overhead).

## Default Value

The default is 8192 rows per granule. This is well-tested and suitable for most analytical workloads.

## How the Sparse Index Works

ClickHouse stores one index entry per granule rather than one per row. When a query filters by the sorting key, ClickHouse:
1. Scans the index to find which granules may contain matching rows
2. Reads only those granules from disk

With `index_granularity = 8192`, a table with 1 million rows has approximately 122 index entries.

## Setting index_granularity

```sql
CREATE TABLE events
(
    event_id   UInt64,
    event_time DateTime,
    user_id    UInt64,
    action     String
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time)
SETTINGS index_granularity = 8192;
```

## Smaller index_granularity - Better Point Lookups

```sql
CREATE TABLE product_catalog
(
    product_id  UInt64,
    name        String,
    price       Float64
)
ENGINE = MergeTree()
ORDER BY product_id
SETTINGS index_granularity = 256;
```

With 256 rows per granule, a lookup by `product_id` reads at most 256 rows from disk instead of 8192. Useful for:
- Low-latency point lookups
- Tables with few rows per sorting key
- OLTP-style access patterns

Trade-off: the index grows larger and uses more memory.

## Larger index_granularity - Better Bulk Scans

```sql
CREATE TABLE log_archive
(
    log_date   Date,
    host       String,
    level      String,
    message    String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (log_date, host)
SETTINGS index_granularity = 16384;
```

Larger granules mean:
- Fewer index entries - less memory for the index
- Better sequential read throughput for full-table scans
- Less index overhead for bulk append workloads

## index_granularity_bytes - Adaptive Granularity

By default, ClickHouse also uses adaptive granularity via `index_granularity_bytes`. Granules are capped at the specified byte size (default 10 MB) even if `index_granularity` rows haven't been reached:

```sql
SETTINGS
    index_granularity       = 8192,
    index_granularity_bytes = 10485760;  -- 10 MB per granule
```

Set `index_granularity_bytes = 0` to disable adaptive granularity and rely solely on row count.

## Checking Actual Granularity

Inspect index marks in a table part:

```sql
SELECT
    table,
    name,
    marks,
    rows,
    round(rows / marks) AS rows_per_mark
FROM system.parts
WHERE table = 'events' AND active = 1
LIMIT 10
```

## Impact on Memory Usage

The primary index is loaded entirely into RAM. A smaller `index_granularity` means more index marks and higher memory usage. Estimate:

```text
index_size_bytes ~= (total_rows / index_granularity) * key_bytes_per_mark
```

For a 1-billion-row table with `index_granularity = 8192` and an 8-byte key, the index is approximately 1 MB (~122,000 marks × 8 bytes).

## Guidelines

| Use Case | Recommended index_granularity |
|----------|-------------------------------|
| OLAP bulk scans | 8192 - 16384 |
| Mixed OLAP/OLTP | 4096 - 8192 |
| Point lookups dominant | 256 - 1024 |
| Append-only logs | 16384 - 65536 |

## Summary

`index_granularity` defines how many rows form one index granule in MergeTree tables. The default of 8192 is appropriate for most analytical workloads. Reduce it for faster point lookups at the cost of larger indexes, or increase it for bulk scan performance and lower index memory usage. Monitor with `system.parts` to verify effective granularity in production.
