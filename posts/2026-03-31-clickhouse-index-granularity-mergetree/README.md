# How to Use index_granularity Setting in MergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Index, Performance, Database, Configuration, SQL

Description: Learn how the index_granularity setting controls ClickHouse MergeTree's sparse primary index, how to tune it for your workload, and the tradeoffs between index precision and memory usage.

---

`index_granularity` is one of the most important low-level settings in ClickHouse's MergeTree engine. It controls how frequently the primary index marks are placed in data files, directly affecting query performance, memory usage, and storage efficiency.

## What Is index_granularity?

ClickHouse's primary index is a sparse index - it does not store an entry for every row. Instead, it stores one entry (called a "mark") per `index_granularity` rows. When you query with a `WHERE` clause on the primary key, ClickHouse uses the index to find the relevant marks and reads only those granules from disk.

```text
Row 0       <- mark 0 stored in index
Row 1
...
Row 8191
Row 8192    <- mark 1 stored in index
Row 8193
...
Row 16383
Row 16384   <- mark 2 stored in index
...
```

The default `index_granularity = 8192` means one mark per 8,192 rows.

## Setting index_granularity

Set it at table creation time:

```sql
CREATE TABLE events
(
    ts       DateTime,
    user_id  UInt64,
    event    String
)
ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS index_granularity = 8192;  -- default
```

`index_granularity` accepts any positive integer. Common choices are powers of 2 such as 1024, 4096, 8192, and 16384, but the value is not restricted to powers of 2 or capped at 8192.

## How ClickHouse Uses Granules

When you run a query like:

```sql
SELECT count()
FROM events
WHERE ts BETWEEN '2026-03-01' AND '2026-03-31';
```

ClickHouse:
1. Consults the primary index to find which marks fall in the range.
2. Reads only the granules (groups of `index_granularity` rows) that overlap the range.
3. Discards rows within those granules that do not match.

The number of "extra" rows read beyond the exact match range is at most `index_granularity - 1` per boundary mark. Smaller granularity = less over-reading = better precision.

## Effect on Read Performance

```sql
-- Table with default granularity
CREATE TABLE events_8k
(
    ts       DateTime,
    user_id  UInt64,
    event    String
)
ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS index_granularity = 8192;

-- Table with smaller granularity (better precision for point queries)
CREATE TABLE events_1k
(
    ts       DateTime,
    user_id  UInt64,
    event    String
)
ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS index_granularity = 1024;

-- Benchmark both tables to compare scan efficiency
EXPLAIN indexes = 1
SELECT count()
FROM events_8k
WHERE ts = '2026-03-15 10:30:00' AND user_id = 42;
```

A smaller granularity reads fewer extra rows for point queries and highly selective range queries. A larger granularity reads more rows but uses less memory for the index.

## Tradeoffs

| granularity | Index size | Index memory | Query precision | Best for |
|---|---|---|---|---|
| 256 - 1024 | Large | Higher | High | Point lookups, narrow range queries |
| 8192 (default) | Medium | Moderate | Medium | General analytics |
| 65536+ | Small | Low | Low | Full scans, bulk aggregations |

## Checking Index Mark Count

```sql
-- See how many marks are in each part
SELECT
    table,
    name AS part,
    rows,
    marks,
    rows / marks AS rows_per_mark
FROM system.parts
WHERE active AND database = 'default' AND table LIKE 'events%'
ORDER BY table, name;
```

`rows_per_mark` should equal your `index_granularity` (or be close to it with adaptive granularity).

## Adaptive Granularity (index_granularity_bytes)

ClickHouse 19.11+ introduced adaptive granularity. Instead of a fixed row count, it adjusts the granule size by bytes:

```sql
CREATE TABLE events_adaptive
(
    ts       DateTime,
    user_id  UInt64,
    payload  String  -- variable-length column
)
ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS
    index_granularity       = 8192,
    index_granularity_bytes = 10485760;  -- 10 MB target granule size
```

With `index_granularity_bytes` set:
- Granules shrink automatically for wide rows (large `payload` values).
- Granules can still be capped by `index_granularity` rows.
- Set `index_granularity_bytes = 0` to disable adaptive mode and use fixed row count only.

```sql
-- Disable adaptive, use pure row-count granularity
SETTINGS
    index_granularity       = 8192,
    index_granularity_bytes = 0;
```

## Checking Current Table Settings

```sql
SELECT
    name,
    engine_full
FROM system.tables
WHERE database = 'default' AND name = 'events';
```

Or query the settings directly:

```sql
SELECT *
FROM system.merge_tree_settings
WHERE name LIKE '%granularity%';
```

## Real-World Recommendations

**Time-series / log analytics (default use case):**
```sql
SETTINGS index_granularity = 8192, index_granularity_bytes = 10485760;
```

**Point-lookup heavy workload (looking up specific users, IDs):**
```sql
SETTINGS index_granularity = 1024, index_granularity_bytes = 0;
```

**Full-scan analytics (no selective filters):**
```sql
SETTINGS index_granularity = 8192, index_granularity_bytes = 10485760;
-- Larger granularity is fine - scans aren't index-limited anyway
```

**Wide rows (large String or Array columns):**
```sql
-- Let adaptive granularity control it
SETTINGS index_granularity = 8192, index_granularity_bytes = 10485760;
```

## Verifying Query Efficiency with EXPLAIN

```sql
EXPLAIN indexes = 1
SELECT ts, user_id, event
FROM events
WHERE ts BETWEEN '2026-03-01 00:00:00' AND '2026-03-01 23:59:59'
  AND user_id = 1234;
```

Look for `Granules: X/Y` in the output - X is the number of granules actually read, Y is the total. A low ratio means good index efficiency.

## Changing index_granularity on Existing Tables

`index_granularity` is set per-part and cannot be changed retroactively for existing parts. You must recreate the table:

```sql
-- Create new table with desired granularity
CREATE TABLE events_new
(
    ts      DateTime,
    user_id UInt64,
    event   String
)
ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS index_granularity = 1024;

-- Copy data
INSERT INTO events_new SELECT * FROM events;

-- Swap (after verifying)
RENAME TABLE events TO events_old, events_new TO events;
```

## Impact on Memory Usage

Each mark entry in the primary index uses approximately 8 bytes (compressed). For 1 billion rows:

- `index_granularity = 8192`: ~122,000 marks, ~1 MB in memory.
- `index_granularity = 1024`: ~976,000 marks, ~8 MB in memory.
- `index_granularity = 128`: ~7.8 million marks, ~62 MB in memory.

For most tables, the index fits easily in memory. Only consider increasing granularity if you have hundreds of billions of rows and memory is tight.

## Summary

`index_granularity` is the lever that controls the precision vs. efficiency tradeoff of ClickHouse's primary index. Key points:

- The default of 8192 rows per granule is optimal for most analytical workloads.
- Reduce to 1024 or lower for point-lookup heavy workloads.
- Use `index_granularity_bytes` (adaptive mode) for tables with variable-length columns.
- Use `EXPLAIN indexes = 1` to measure how many granules are read per query.
- Changing `index_granularity` requires recreating the table - plan this at schema design time.
