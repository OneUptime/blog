# How ClickHouse Mark Files and Granules Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Mark File, Granule, Primary Index, Internal

Description: A detailed explanation of ClickHouse mark files and granules, showing how they bridge the sparse primary index and column data files for efficient I/O.

---

## Granules: The Atomic Read Unit

ClickHouse stores column data in compressed blocks. Within each block, data is logically divided into granules. A granule is the smallest unit of data that ClickHouse reads from disk. The default granule size is 8192 rows.

```sql
-- Check the index_granularity setting for a table
SELECT name, value
FROM system.merge_tree_settings
WHERE name = 'index_granularity';

-- Or check per-table setting
SHOW CREATE TABLE events;
```

## What Are Mark Files

For each column in a MergeTree part, ClickHouse writes a mark file (`.mrk`, `.mrk2`, or `.mrk3`). The mark file is an array of entries, one per granule. Each entry contains:

1. The byte offset in the compressed `.bin` file where the granule's block starts
2. The byte offset within the uncompressed block where the granule starts

```text
Column file: events/all_1_1_0/event_time.bin (compressed)
Mark file:   events/all_1_1_0/event_time.mrk3

Mark entry [0]: compressed_offset=0,      uncompressed_offset=0
Mark entry [1]: compressed_offset=12345,  uncompressed_offset=0
Mark entry [2]: compressed_offset=24890,  uncompressed_offset=0
...
```

## How Marks Bridge Index to Data

When a query arrives:

1. Primary index binary search finds granule range `[g_start, g_end]`
2. For each needed column, read mark entries `[g_start, g_end]`
3. Use mark entries to seek to correct compressed block positions
4. Decompress and decode only those granule ranges

```text
query: WHERE user_id = 42 AND event_time >= today()

Primary index says: granules 1000-1050 may contain matching rows
Mark file says: compressed byte range [offset_1000, offset_1051)
Column read: seek to offset_1000, decompress, filter rows
```

## Adaptive Granularity

Since ClickHouse 19.11, adaptive index granularity adjusts granule sizes so each granule uses approximately `index_granularity_bytes` (default 10MB uncompressed) rather than a fixed row count. This prevents granules from being too large for wide-row tables.

```sql
CREATE TABLE events (
  event_id UInt64,
  payload  String  -- large column
) ENGINE = MergeTree()
ORDER BY event_id
SETTINGS
  index_granularity = 8192,
  index_granularity_bytes = 10485760;  -- 10MB per granule
```

With adaptive granularity, granules containing large String or Array values will have fewer rows but similar byte size.

## Viewing Mark File Size

```sql
SELECT
  column,
  formatReadableSize(marks_bytes) AS marks_size,
  formatReadableSize(data_compressed_bytes) AS data_size
FROM system.columns
WHERE table = 'events' AND database = 'analytics'
ORDER BY marks_bytes DESC;
```

Mark files are typically small (a few KB to MB), always fit in the OS page cache, and their I/O cost is negligible.

## Multiple Mark Formats

```text
Format  | Description
--------|------------------------------------
.mrk    | Fixed 16-byte entries (non-adaptive)
.mrk2   | Variable entries for adaptive granularity
.mrk3   | Mark files for compact parts (ClickHouse 22.9+)
```

`.mrk3` compresses the mark data, reducing disk usage for tables with many columns.

## Summary

ClickHouse mark files are index structures that map granule numbers to byte offsets in compressed column data files. They are the critical link between the sparse primary index (which identifies relevant granule ranges) and the actual column reads (which need exact seek positions). The default granule size of 8192 rows balances index overhead with I/O granularity. Adaptive granularity automatically adjusts granule sizes for tables with large column values.
