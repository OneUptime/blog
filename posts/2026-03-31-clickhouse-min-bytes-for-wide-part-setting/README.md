# How to Use min_bytes_for_wide_part Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, min_bytes_for_wide_part, Part Format, Setting, Performance

Description: Learn how to configure the min_bytes_for_wide_part setting in ClickHouse to control when MergeTree parts switch from compact to wide columnar format for optimal I/O.

---

`min_bytes_for_wide_part` is a MergeTree table-level setting that controls the minimum byte size at which a data part switches from compact format (single combined file) to wide format (one file per column). Tuning this threshold has a direct impact on query I/O efficiency and file descriptor usage.

## Default Value

```sql
-- Default: 10 MB (10,485,760 bytes)
SELECT value
FROM system.merge_tree_settings
WHERE name = 'min_bytes_for_wide_part';
```

```text
value
10485760
```

## Setting It at Table Creation

```sql
CREATE TABLE events (
    ts       DateTime,
    user_id  UInt64,
    event    LowCardinality(String),
    value    Float64
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id)
SETTINGS min_bytes_for_wide_part = 10485760;
```

## Modifying on an Existing Table

```sql
ALTER TABLE events MODIFY SETTING min_bytes_for_wide_part = 1048576;   -- 1 MB
ALTER TABLE events MODIFY SETTING min_bytes_for_wide_part = 104857600;  -- 100 MB
```

The change applies to newly written parts immediately; existing parts retain their format until merged.

## Effect on Part Format

```sql
-- Check which format parts are using after the change
SELECT
    name,
    part_type,
    formatReadableSize(bytes_on_disk) AS size,
    rows
FROM system.parts
WHERE table = 'events' AND active = 1
ORDER BY bytes_on_disk DESC
LIMIT 10;
```

```text
name              part_type  size     rows
202603_1_50_3     Wide       250 MiB  5000000
202603_51_55_1    Compact    500 KiB  10000
```

## Lower Threshold: Better Column Pruning Earlier

For tables with many columns (20+) that are rarely queried together:

```sql
-- Switch to wide format at 1 MB so columnar I/O kicks in earlier
ALTER TABLE analytics_events MODIFY SETTING min_bytes_for_wide_part = 1048576;
```

Benefit: queries that SELECT only 2-3 columns out of 30+ skip 90%+ of on-disk data even for smaller parts.

## Higher Threshold: Fewer File Descriptors

For tables with frequent small inserts (IoT, logging):

```sql
-- Keep parts compact until 100 MB to reduce file descriptor pressure
ALTER TABLE iot_readings MODIFY SETTING min_bytes_for_wide_part = 104857600;
```

Benefit: compact format uses fewer file descriptors per part, which matters when you have many small unmerged parts.

## Companion Setting: min_rows_for_wide_part

An alternative row-count-based threshold:

```sql
-- Use wide format after 1 million rows
ALTER TABLE events MODIFY SETTING min_rows_for_wide_part = 1000000;
```

Parts exceeding either `min_bytes_for_wide_part` OR `min_rows_for_wide_part` will use wide format.

## Resetting to Default

```sql
ALTER TABLE events RESET SETTING min_bytes_for_wide_part;
```

## Summary

`min_bytes_for_wide_part` controls the byte-size threshold at which MergeTree parts transition from compact (one file for all columns) to wide (one file per column) format. Lower the threshold to enable columnar I/O and column pruning on smaller parts - especially for wide tables with many columns. Raise the threshold for narrow tables or high-frequency small-insert workloads where minimizing file descriptor count is more important.
