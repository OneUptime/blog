# How to Use system.parts for Partition Monitoring in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.parts, Partition, Monitoring, MergeTree, Storage

Description: Use system.parts to monitor active and inactive data parts, partition sizes, row counts, and compression ratios across your ClickHouse tables.

---

ClickHouse stores table data as immutable "parts" on disk - each INSERT creates new parts that are later merged by background processes. The `system.parts` table exposes detailed metadata about every part, making it essential for partition monitoring, storage auditing, and troubleshooting merge issues.

## Basic system.parts Query

List active parts for a table:

```sql
SELECT
    partition,
    name,
    rows,
    bytes_on_disk,
    data_compressed_bytes,
    data_uncompressed_bytes,
    marks,
    modification_time
FROM system.parts
WHERE database = 'mydb'
  AND table    = 'events'
  AND active   = 1
ORDER BY partition;
```

## Monitoring Partition Sizes

Aggregate by partition to see data distribution:

```sql
SELECT
    partition,
    count()                             AS part_count,
    sum(rows)                           AS total_rows,
    formatReadableSize(sum(bytes_on_disk))         AS disk_size,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    round(sum(data_compressed_bytes) /
          sum(data_uncompressed_bytes), 3)         AS compression_ratio
FROM system.parts
WHERE database = 'mydb'
  AND table    = 'events'
  AND active   = 1
GROUP BY partition
ORDER BY partition DESC;
```

## Finding Tables with Too Many Parts

Too many active parts per partition causes slow inserts and high memory usage:

```sql
SELECT
    database,
    table,
    partition,
    count() AS active_parts
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
HAVING active_parts > 100
ORDER BY active_parts DESC;
```

When `active_parts` exceeds `parts_to_delay_insert` (default 150), ClickHouse begins throttling inserts. At `parts_to_throw_insert` (default 300), inserts are rejected entirely. Investigate merge queues if this happens.

## Checking Part Creation Timeline

See how parts are accumulating over time:

```sql
SELECT
    toStartOfHour(modification_time) AS hour,
    count()                           AS parts_created
FROM system.parts
WHERE database = 'mydb'
  AND table    = 'events'
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;
```

## Listing Inactive Parts

Inactive parts are those awaiting deletion after a merge:

```sql
SELECT
    partition,
    name,
    rows,
    bytes_on_disk,
    modification_time
FROM system.parts
WHERE database = 'mydb'
  AND table    = 'events'
  AND active   = 0
ORDER BY modification_time DESC
LIMIT 20;
```

Inactive parts are cleaned up automatically, but a large accumulation may indicate merge issues.

## Checking Partition for Manual Operations

Before running `ALTER TABLE ... DROP PARTITION`, confirm partition contents:

```sql
SELECT
    partition,
    sum(rows)                        AS rows,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    max(modification_time)           AS last_modified
FROM system.parts
WHERE database = 'mydb'
  AND table    = 'events'
  AND active   = 1
GROUP BY partition
ORDER BY partition;
```

## Summary

`system.parts` is the primary tool for partition-level monitoring in ClickHouse. Use it to track part counts per partition, identify tables with excessive fragmentation, monitor compression ratios, and audit storage usage. Combine it with `system.merges` for a complete picture of the background merge pipeline.
