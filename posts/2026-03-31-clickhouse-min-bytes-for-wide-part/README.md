# How to Use min_bytes_for_wide_part in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Configuration, Performance, Database, Storage

Description: Learn what min_bytes_for_wide_part controls in ClickHouse MergeTree, how compact and wide part formats differ, and how to tune this setting for your insert patterns and query workloads.

---

`min_bytes_for_wide_part` is a MergeTree setting in ClickHouse that controls when a data part is stored in "wide" columnar format versus the more compact "compact" format. Tuning this threshold can significantly improve performance for both high-frequency small inserts and large analytical queries.

## Two Part Storage Formats

ClickHouse MergeTree stores data in one of two formats:

**Compact format:** All columns for a part are stored in a single file (`data.bin`). Designed for small parts (few rows, small size). Reduces the number of file handles and inode pressure for tables with many tiny parts.

**Wide format:** Each column is stored in its own file (`column_name.bin` + `column_name.mrk2`). Designed for large parts. Enables column-level I/O - only the columns referenced in a query are read from disk.

## The Setting

```sql
CREATE TABLE events
(
    ts      DateTime,
    user_id UInt64,
    event   String
)
ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS
    min_bytes_for_wide_part = 10485760,  -- 10 MB (default)
    min_rows_for_wide_part  = 0;         -- 0 = disabled by default
```

- If a new part's uncompressed size is below `min_bytes_for_wide_part`, it is stored in compact format.
- If it is at or above the threshold, it is stored in wide format.
- `min_rows_for_wide_part` provides the same control based on row count instead of bytes.

## Default Values

| Setting | Default |
|---|---|
| `min_bytes_for_wide_part` | 10,485,760 (10 MB) |
| `min_rows_for_wide_part` | 0 (disabled) |

With defaults, parts smaller than 10 MB use compact format, and parts 10 MB or larger use wide format.

## Checking Part Formats

```sql
SELECT
    name             AS part,
    part_type,       -- 'Compact' or 'Wide'
    rows,
    formatReadableSize(data_compressed_bytes) AS compressed_size
FROM system.parts
WHERE active AND database = 'default' AND table = 'events'
ORDER BY rows DESC
LIMIT 20;
```

## Why This Matters for Insert Performance

When you insert data in small batches, ClickHouse creates many small parts. Small parts in compact format:
- Use a single file descriptor (lower OS overhead).
- Are faster to write (one file open/close operation).
- Are ideal for the period before background merges consolidate them.

```sql
-- Simulate high-frequency small inserts
INSERT INTO events VALUES (now(), 1, 'click');
INSERT INTO events VALUES (now(), 2, 'view');
-- These produce tiny compact parts; compact format is appropriate here
```

After merges consolidate them into large parts, the merged output crosses the `min_bytes_for_wide_part` threshold and is written as wide format.

## Why This Matters for Query Performance

Wide parts enable column pruning at the OS level. If your query only reads `ts` and `user_id`, ClickHouse opens only those two column files and never touches `event`:

```sql
-- Only ts and user_id column files are opened on wide parts
SELECT ts, user_id
FROM events
WHERE ts >= today();
```

On a compact part, ClickHouse must read the single combined file and skip over columns it does not need.

## Tuning for Different Workloads

**High-frequency small inserts (IoT, real-time events):**

Keep `min_bytes_for_wide_part` at the default or higher to ensure small arriving parts use compact format:

```sql
SETTINGS
    min_bytes_for_wide_part = 10485760,  -- 10 MB
    min_rows_for_wide_part  = 0;
```

**Batch insert workloads (nightly ETL):**

Your inserts are already large, so parts hit the threshold immediately. Keep the default:

```sql
SETTINGS
    min_bytes_for_wide_part = 10485760;
```

**Wide tables with many columns:**

Lower the threshold so that parts switch to wide format sooner, enabling better column pruning:

```sql
SETTINGS
    min_bytes_for_wide_part = 1048576;  -- 1 MB
```

**Tables with very narrow rows:**

Use `min_rows_for_wide_part` instead of bytes for more predictable behavior:

```sql
SETTINGS
    min_bytes_for_wide_part = 0,          -- disable byte threshold
    min_rows_for_wide_part  = 100000;     -- switch to wide at 100K rows
```

## Full Table Example with Explicit Settings

```sql
CREATE TABLE http_access_logs
(
    ts              DateTime,
    date            Date MATERIALIZED toDate(ts),
    client_ip       IPv4,
    method          LowCardinality(String),
    path            String,
    status_code     UInt16,
    response_bytes  UInt32,
    duration_ms     UInt32,
    referer         String,
    user_agent      String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, client_ip, status_code)
SETTINGS
    index_granularity              = 8192,
    index_granularity_bytes        = 10485760,
    min_bytes_for_wide_part        = 10485760,  -- 10 MB
    min_rows_for_wide_part         = 0,
    enable_mixed_granularity_parts = 1;
```

## What Happens During Merges

When ClickHouse merges compact parts into a larger merged part, it re-evaluates the format:

- If the merged part's uncompressed size exceeds `min_bytes_for_wide_part`, it is written as wide.
- This means data naturally transitions from compact to wide as it ages and merges.

```text
Insert 1 (1 KB)  -> compact part
Insert 2 (1 KB)  -> compact part
Insert 3 (1 KB)  -> compact part
...
Background merge -> 15 MB wide part (exceeds threshold)
```

## Monitoring Part Type Distribution

```sql
-- Ratio of compact vs wide parts
SELECT
    part_type,
    count()                                         AS parts,
    sum(rows)                                       AS total_rows,
    formatReadableSize(sum(data_compressed_bytes))  AS total_size
FROM system.parts
WHERE active AND database = 'default' AND table = 'http_access_logs'
GROUP BY part_type;
```

A healthy table has few compact parts (those are recently inserted, waiting for merge) and mostly wide parts (merged, stable data).

## Setting at the Server Level

Apply a default for all new tables via `config.xml`:

```xml
<merge_tree>
    <min_bytes_for_wide_part>10485760</min_bytes_for_wide_part>
    <min_rows_for_wide_part>0</min_rows_for_wide_part>
</merge_tree>
```

Or per-user profile in `users.xml`:

```xml
<profiles>
    <default>
        <min_bytes_for_wide_part>10485760</min_bytes_for_wide_part>
    </default>
</profiles>
```

## Summary

`min_bytes_for_wide_part` is the threshold that determines whether a new MergeTree part uses compact (single-file) or wide (per-column-file) storage. Key points:

- Small parts (below the threshold) use compact format - fewer file handles, faster for high-frequency inserts.
- Large parts (at or above the threshold) use wide format - column-level I/O, better for analytical queries.
- The default of 10 MB is appropriate for most workloads.
- Lower the threshold for wide tables with many columns to improve column pruning sooner.
- Use `min_rows_for_wide_part` as an alternative control based on row count.
- Monitor `system.parts` to verify the part type distribution in your table.
