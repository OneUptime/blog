# How to Calculate Storage Requirements for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Capacity Planning, Compression, Infrastructure

Description: Accurately estimate ClickHouse disk storage needs by measuring compression ratios, accounting for replicas, and projecting growth over your retention window.

---

Storage is often the first capacity constraint hit in ClickHouse. Accurate estimates require measuring compression ratios on your actual data rather than relying on generic rules.

## Measure Compression on a Sample

Insert a representative sample and check the compressed size:

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active
GROUP BY table;
```

Typical ratios: logs 8-12x, metrics 5-8x, wide tables with many NULLs 15-20x.

## Formula

```text
storage_needed = (raw_daily_bytes / compression_ratio)
                * retention_days
                * replication_factor
                * 1.3  -- 30% headroom for merges and temp files
```

Example:

```text
Raw daily ingest: 2 TB
Compression ratio: 8x
Retention: 60 days
Replicas: 2
Headroom: 1.3

Storage = (2 TB / 8) * 60 * 2 * 1.3 = 39 TB
```

## Query Current Usage

```sql
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size,
    sum(rows) AS total_rows,
    min(min_date) AS oldest_partition,
    max(max_date) AS newest_partition
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;
```

## Account for Parts During Merges

ClickHouse temporarily doubles disk usage during large merges. Allocate at least 2x the largest partition size as free space:

```sql
SELECT
    partition,
    formatReadableSize(sum(bytes_on_disk)) AS partition_size
FROM system.parts
WHERE table = 'events' AND active
GROUP BY partition
ORDER BY sum(bytes_on_disk) DESC
LIMIT 5;
```

## TTL to Control Growth

Automatically delete old partitions:

```sql
ALTER TABLE events MODIFY TTL ts + INTERVAL 60 DAY;
```

Move cold data to cheaper storage before deletion:

```sql
ALTER TABLE events MODIFY TTL
    ts + INTERVAL 30 DAY TO DISK 's3_cold',
    ts + INTERVAL 60 DAY DELETE;
```

## Summary

Calculate ClickHouse storage from measured compression ratios, not generic estimates. Include headroom for merges and multiply by the replication factor. TTL policies automate retention and keep actual usage within your estimates.
