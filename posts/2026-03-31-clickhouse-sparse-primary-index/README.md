# How ClickHouse Sparse Primary Index Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Primary Index, ORDER BY, Granule, Internal

Description: A deep dive into ClickHouse's sparse primary index design, explaining how it differs from B-tree indexes, how granules work, and how queries use the index for range pruning.

---

## Dense vs Sparse Index

Traditional databases (PostgreSQL, MySQL) use dense B-tree indexes where every row has an index entry. ClickHouse uses a sparse index: one entry per granule (default 8192 rows). This makes the index small enough to fit entirely in RAM.

For a table with 1 billion rows:
- Dense index: ~1 billion entries
- Sparse index at granularity 8192: ~122,000 entries

```sql
-- Check primary index size in memory
SELECT
  table,
  formatReadableSize(sum(primary_key_bytes_in_memory)) AS pk_memory
FROM system.parts
WHERE active = 1
  AND table = 'events'
GROUP BY table;
```

## How the Index Is Built

When a MergeTree part is written, ClickHouse sorts data by the `ORDER BY` columns and writes the first row of each 8192-row granule to `primary.idx`.

```sql
CREATE TABLE events (
  user_id    UInt64,
  event_time DateTime,
  event_type String,
  amount     Float64
) ENGINE = MergeTree()
ORDER BY (user_id, event_time)
SETTINGS index_granularity = 8192;
```

The index stores `(user_id, event_time)` tuples for rows 0, 8192, 16384, 24576, etc.

## Mark Files: Translating Index to Disk Position

For each column, a `.mrk2` mark file stores the block offset in the compressed `.bin` file and the granule offset within the uncompressed block for each granule. When the primary index identifies relevant granules, mark files tell ClickHouse exactly where to seek in each column file.

```text
Query: WHERE user_id = 42 AND event_time >= '2026-03-01'

primary.idx lookup:
  Find all granules where user_id range includes 42
  and event_time range includes values >= 2026-03-01

Mark file lookup:
  Get compressed byte offsets for those granules in each column file

Column file read:
  Seek to offsets, decompress granules, evaluate row-level filter
```

## Binary Search on the Sparse Index

When a query has a WHERE clause on the first ORDER BY column, ClickHouse performs a binary search on the sparse index to find the starting and ending granule.

```sql
-- Efficient: uses primary index (user_id is first ORDER BY column)
SELECT sum(amount) FROM events WHERE user_id = 42;

-- Less efficient: second column filter without first
SELECT sum(amount) FROM events WHERE event_time >= today();
-- Still reads full index to find eligible granules
```

## Granularity Tuning

The default `index_granularity = 8192` rows is appropriate for most tables. For wide rows (many large columns), reduce it to limit I/O per granule. For very narrow rows (few small columns), increase it to reduce index size.

```sql
-- Smaller granularity for wide rows
CREATE TABLE wide_events (
  event_id   UInt64,
  payload    String,  -- large JSON payload
  event_time DateTime
) ENGINE = MergeTree()
ORDER BY event_time
SETTINGS index_granularity = 1024;  -- smaller granules
```

## Viewing Index Effectiveness with EXPLAIN

```sql
EXPLAIN indexes = 1
SELECT sum(amount) FROM events WHERE user_id = 42 AND event_time >= today();
```

Output shows `Granules: 5/122000` meaning 99.99% of granules were pruned by the primary index.

## Summary

ClickHouse's sparse primary index stores one entry per 8192 rows, making it small enough to always fit in RAM. At query time, ClickHouse binary-searches the sparse index to identify which granules to read, then uses mark files to seek to those positions in column data files. This design enables fast range pruning without a B-tree, at the cost of reading up to 8191 extra rows at the boundary granules of a range scan.
