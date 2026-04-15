# How to Use Wide vs Compact Part Format in MergeTree

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Part Format, Wide, Compact, Storage, Performance

Description: Learn the difference between wide and compact MergeTree part formats in ClickHouse and how to configure min_bytes_for_wide_part and min_rows_for_wide_part.

---

ClickHouse MergeTree stores data in parts - one per INSERT batch (before merging). Each part uses one of two storage formats: **compact** (all columns in a single file) or **wide** (one file per column). The format is chosen automatically based on part size, but you can tune the thresholds for better performance.

## Compact Format

In compact format, all column data is stored in a single `data.bin` file with a column offsets file. This is efficient for small parts because it reduces file descriptor usage and OS file metadata overhead.

```text
part_name/
  data.bin         -- all columns merged into one file
  data.mrk3        -- marks file
  checksums.txt
  columns.txt
  primary.idx
```

## Wide Format

In wide format, each column has its own `.bin` and `.mrk3` file. This enables ClickHouse to read only the columns needed for a query (columnar I/O), which is the main performance advantage of columnar storage.

```text
part_name/
  ts.bin           -- DateTime column
  ts.mrk2
  user_id.bin      -- UInt64 column
  user_id.mrk2
  event.bin        -- String column
  event.mrk2
  primary.idx
  checksums.txt
  columns.txt
```

## Format Selection Thresholds

Two settings control when a part uses wide format instead of compact:

```sql
-- If part size exceeds this (bytes), use wide format
SETTINGS min_bytes_for_wide_part = 10485760  -- 10 MB default

-- If part row count exceeds this, use wide format
SETTINGS min_rows_for_wide_part = 0          -- 0 = always satisfied (row count is not a factor)
```

When both thresholds are exceeded, the part is written in wide format. Since `min_rows_for_wide_part` defaults to 0, the row condition is always satisfied, so effectively only the byte threshold matters in the default configuration.

## Checking Current Format of Parts

```sql
SELECT
    name,
    part_type,
    rows,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE table = 'events'
  AND active = 1
ORDER BY bytes_on_disk DESC
LIMIT 20;
```

```text
name            part_type  rows      size
202603_1_100_3  Wide       50000000  2.34 GiB
202603_101_120_1 Compact   500       12.4 KiB
```

## Tuning for Wide vs Compact

For **tables with many columns** (20+):
- Lower `min_bytes_for_wide_part` so parts switch to wide format sooner.
- This reduces I/O by enabling column projection (only needed columns read).

```sql
ALTER TABLE wide_table MODIFY SETTING min_bytes_for_wide_part = 1048576;  -- 1 MB
```

For **tables with few columns** (3-5):
- Higher threshold keeps more parts in compact format.
- Saves file descriptor overhead for high-frequency small inserts.

```sql
ALTER TABLE narrow_table MODIFY SETTING min_bytes_for_wide_part = 104857600;  -- 100 MB
```

## Impact on Query Performance

Wide format benefits:
- Queries reading a subset of columns avoid loading unneeded data.
- Columnar compression is more effective per-column than interleaved.

Compact format benefits:
- Fewer open file descriptors per part.
- Faster for small parts that are still being merged.

## Using Row Count Instead of Byte Count

```sql
-- Switch to wide format after 1 million rows (regardless of size)
ALTER TABLE events MODIFY SETTING min_rows_for_wide_part = 1000000;
```

This is useful when column sizes vary greatly across rows.

## Summary

Compact format stores all columns in one file (good for small parts), while wide format uses one file per column (good for large parts with columnar queries). ClickHouse switches automatically based on `min_bytes_for_wide_part` and `min_rows_for_wide_part`. Tune these thresholds: lower them for wide, many-column tables to enable columnar I/O sooner; raise them for narrow tables with frequent small inserts to reduce file descriptor pressure.
