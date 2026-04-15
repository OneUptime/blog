# How to Use system.parts Table for Partition Analysis in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Partition, MergeTree, System Table, Storage

Description: Learn how to query system.parts to analyze partition sizes, part counts, compression ratios, and storage distribution across your MergeTree tables.

---

Every MergeTree table in ClickHouse is physically stored as a collection of immutable parts on disk. The `system.parts` table exposes metadata for every part across every MergeTree table on the node: which partition it belongs to, how large it is, how compressed it is, how many rows it contains, and whether it is active or being merged away. This data is essential for partition management, storage planning, and diagnosing write amplification.

## What system.parts Contains

```sql
DESCRIBE system.parts;
```

Key columns:

| Column | Type | Meaning |
|---|---|---|
| `database` | String | Database owning the table |
| `table` | String | Table name |
| `partition` | String | Partition key value |
| `partition_id` | String | Internal partition identifier |
| `name` | String | Part name (encodes min/max block numbers) |
| `active` | UInt8 | 1 = in use, 0 = being replaced |
| `marks` | UInt64 | Number of index granule marks |
| `rows` | UInt64 | Row count in this part |
| `bytes_on_disk` | UInt64 | Compressed bytes on disk |
| `data_compressed_bytes` | UInt64 | Compressed data bytes (excludes indices) |
| `data_uncompressed_bytes` | UInt64 | Uncompressed data bytes |
| `primary_key_bytes_in_memory` | UInt64 | Memory used by the primary key index |
| `modification_time` | DateTime | When this part was written |
| `min_date` / `max_date` | Date | Date range of rows in this part |
| `min_time` / `max_time` | DateTime | DateTime range of rows in this part |
| `level` | UInt32 | Merge depth (0 = fresh write) |

## Always Filter to Active Parts

```sql
-- Add WHERE active = 1 to all queries unless you explicitly want inactive parts
SELECT count()
FROM system.parts
WHERE active = 1;
```

Inactive parts are ones that have been superseded by a merge but not yet removed from disk. Including them inflates size and row counts.

## Summary Per Table

```sql
SELECT
    database,
    table,
    count()                                          AS parts,
    sum(rows)                                        AS total_rows,
    formatReadableSize(sum(bytes_on_disk))           AS disk_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) /
          nullIf(sum(data_compressed_bytes), 0), 2)   AS compression_ratio
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;
```

## Partition-Level Breakdown

```sql
SELECT
    partition,
    count()                                          AS parts,
    sum(rows)                                        AS rows,
    formatReadableSize(sum(bytes_on_disk))           AS disk_size,
    min(min_date)                                    AS earliest,
    max(max_date)                                    AS latest
FROM system.parts
WHERE database = 'default'
  AND table    = 'events'
  AND active   = 1
GROUP BY partition
ORDER BY partition;
```

## Find Partitions That Are Too Fragmented

```sql
SELECT
    database,
    table,
    partition,
    count()          AS parts,
    sum(rows)        AS rows,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
HAVING parts > 50
ORDER BY parts DESC;
```

A partition with more than 50 active parts indicates that merges are lagging behind inserts. ClickHouse begins throttling inserts at 150 active parts per partition (the `parts_to_delay_insert` threshold) and rejects them entirely with a "Too many parts" error at 300 parts (`parts_to_throw_insert`).

## Compression Ratio Per Partition

```sql
SELECT
    database,
    table,
    partition,
    round(sum(data_uncompressed_bytes) /
          nullIf(sum(data_compressed_bytes), 0), 2) AS compression_ratio,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
ORDER BY compression_ratio DESC;
```

High compression ratios (> 5x) indicate well-sorted, low-cardinality columns. Ratios close to 1x suggest random or already-compressed data.

## Find the Oldest Parts

```sql
SELECT
    database,
    table,
    name                              AS part_name,
    modification_time,
    formatReadableSize(bytes_on_disk) AS size,
    rows
FROM system.parts
WHERE active = 1
ORDER BY modification_time ASC
LIMIT 10;
```

Very old active parts that have never been merged may indicate a table that stopped receiving writes or one where TTL is misconfigured.

## Identify Parts Outside the Expected Date Range

```sql
SELECT
    database,
    table,
    partition,
    name,
    min_date,
    max_date,
    rows,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE active    = 1
  AND max_date  < today() - 365
  AND database  = 'default'
ORDER BY max_date ASC;
```

Use this to find partitions eligible for `ALTER TABLE ... DROP PARTITION`.

## Drop Old Partitions Based on Query Results

```sql
-- Preview which partitions will be dropped
SELECT DISTINCT partition_id, partition
FROM system.parts
WHERE database = 'default'
  AND table    = 'events'
  AND active   = 1
  AND max_date < toDate('2024-01-01')
ORDER BY partition;
```

```sql
-- Drop a specific old partition
ALTER TABLE default.events DROP PARTITION '2023-12';
```

## Storage Distribution Across Disks

```sql
SELECT
    database,
    table,
    disk_name,
    count()                                AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active = 1
GROUP BY database, table, disk_name
ORDER BY sum(bytes_on_disk) DESC;
```

## Parts Merge Depth Analysis

```sql
SELECT
    database,
    table,
    level,
    count()                                AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active = 1
  AND database = 'default'
  AND table    = 'events'
GROUP BY database, table, level
ORDER BY level;
```

`level = 0` parts are raw inserts that have not been merged yet. High counts of level-0 parts mean the background merge pool is congested.

## Shell Script: Report Fragmented Partitions

```bash
#!/usr/bin/env bash
# Print all partitions with more than 30 active parts

clickhouse-client --query "
    SELECT
        database,
        table,
        partition,
        count()          AS parts,
        sum(rows)        AS rows,
        formatReadableSize(sum(bytes_on_disk)) AS size
    FROM system.parts
    WHERE active = 1
    GROUP BY database, table, partition
    HAVING parts > 30
    ORDER BY parts DESC
    FORMAT PrettyCompactNoEscapes
"
```

## Common Pitfalls

- Never rely on `system.parts` row counts for production reporting. The table includes rows for inactive parts, and even active parts may have duplicate rows transiently during a merge. Use a SELECT COUNT() on the actual table instead.
- `bytes_on_disk` includes checksums, index files, and metadata alongside data files. It is always slightly larger than `data_compressed_bytes`.
- Partitions that were just created may show `min_date = max_date = '1970-01-01'` if the table does not use a date-based partition key.

## Summary

`system.parts` is the lowest-level view into MergeTree storage available without touching the filesystem. Use it to track partition growth, spot fragmentation before it causes write slowdowns, measure compression effectiveness, and identify stale data that should be dropped. Pair it with `system.merges` to get the full picture of how ClickHouse is managing your data on disk.
