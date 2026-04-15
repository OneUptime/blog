# How ClickHouse Primary Index Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Primary Index, MergeTree, Internal, Query Optimization

Description: A deep dive into how ClickHouse builds and uses the sparse primary index to skip data during queries, with examples showing index granularity and mark files.

---

## The Sparse Index Design

Unlike traditional databases with a B-tree index that stores one entry per row, ClickHouse uses a sparse index. It stores one index entry per granule, where a granule is a fixed number of rows (default 8192). This means an index for 100 million rows has only about 12,207 entries - it fits easily in RAM.

## How the Index Is Built

When ClickHouse writes a part, it sorts all rows by the ORDER BY key, then writes one entry into `primary.idx` for every 8192nd row:

```sql
CREATE TABLE events (
    user_id UInt64,
    event_time DateTime,
    event_type String
) ENGINE = MergeTree()
ORDER BY (user_id, event_time);
```

The index stores `(user_id, event_time)` values at positions 0, 8192, 16384, etc. of the sorted data.

## Binary Search at Query Time

When you run a query with a WHERE clause on the primary key:

```sql
SELECT count() FROM events
WHERE user_id = 42 AND event_time >= '2024-01-01';
```

ClickHouse performs a binary search over `primary.idx` to find the range of granules that could contain `user_id = 42`. It skips all granules outside that range without reading the column data files.

## Mark Files Link Index to Data

The `primary.idx` tells ClickHouse which granule to read. The `.mrk2` mark file (used with the default adaptive granularity) maps each granule number to an offset in the corresponding column data file (e.g., `user_id.bin`):

```text
granule 0  -> offset 0 in user_id.bin
granule 1  -> offset 4096 in user_id.bin
granule 2  -> offset 9210 in user_id.bin
```

ClickHouse can jump directly to the right offset using `pread`, avoiding sequential scans.

## Visualizing Index Granularity

```sql
-- See actual granule sizes (adaptive granularity)
SELECT
    name,
    marks,
    rows,
    rows / marks AS avg_rows_per_mark
FROM system.parts
WHERE table = 'events' AND active = 1
LIMIT 5;
```

## Compound Primary Keys

With compound ORDER BY keys, the index is most effective when queries filter on the leftmost columns:

```sql
-- Good: filters on leftmost key
SELECT * FROM events WHERE user_id = 42;

-- Less effective: filters only on second key
SELECT * FROM events WHERE event_time >= '2024-01-01';
```

For the second query, ClickHouse cannot use the sparse index efficiently and must scan more granules. Consider using a secondary skipping index for such patterns.

## Adaptive Granularity

Since ClickHouse 19.x, adaptive index granularity adjusts granule size so that each granule is approximately 10 MB of uncompressed data rather than a fixed 8192 rows. This helps with tables with very wide rows.

```sql
-- Check if adaptive granularity is on (default)
SELECT value FROM system.settings WHERE name = 'index_granularity_bytes';
```

## Summary

ClickHouse's sparse primary index stores one entry per granule of sorted data, enabling binary search to skip most of the dataset during queries. Combined with mark files that map granules to byte offsets in column files, this design lets ClickHouse read only the data it needs - making range queries on primary key columns extremely fast even at petabyte scale.
