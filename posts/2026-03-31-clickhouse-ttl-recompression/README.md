# How to Use TTL with Recompression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TTL, Recompression, ZSTD, Storage Optimization

Description: Learn how to use ClickHouse TTL RECOMPRESS rules to automatically apply heavier compression codecs to aging data, reducing long-term storage costs.

---

## Why Recompression on Aging Data?

Hot data benefits from fast codecs like LZ4 that decompress quickly at the cost of larger file sizes. As data ages and is queried less frequently, the trade-off shifts: heavier compression like ZSTD saves disk space and reduces object storage costs, and the slower decompression is acceptable for infrequent queries.

## Basic TTL with RECOMPRESS

```sql
CREATE TABLE http_logs (
    timestamp   DateTime,
    service     LowCardinality(String),
    payload     String    CODEC(LZ4),
    status_code UInt16
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, service)
TTL
    timestamp + INTERVAL 7  DAY RECOMPRESS CODEC(ZSTD(1)),
    timestamp + INTERVAL 30 DAY RECOMPRESS CODEC(ZSTD(9));
```

After 7 days, data is recompressed with ZSTD level 1 (fast but better ratio than LZ4). After 30 days, it is further recompressed with ZSTD level 9 (high compression).

## RECOMPRESS Combined with Volume Move

Move and recompress in the same TTL rule:

```sql
ALTER TABLE http_logs
MODIFY TTL
    timestamp + INTERVAL 30 DAY TO VOLUME 'cold',
    timestamp + INTERVAL 31 DAY RECOMPRESS CODEC(ZSTD(3)),
    timestamp + INTERVAL 90 DAY TO VOLUME 'archive',
    timestamp + INTERVAL 91 DAY RECOMPRESS CODEC(ZSTD(22)),
    timestamp + INTERVAL 365 DAY DELETE;
```

RECOMPRESS and TO VOLUME are separate TTL actions and cannot be combined in a single rule. Use staggered intervals to apply both. ZSTD level 22 provides maximum compression for archival data queried only occasionally.

## Checking Current Codec per Part

```sql
SELECT
    name,
    formatReadableSize(bytes_on_disk) AS size,
    formatReadableSize(data_compressed_bytes) AS compressed,
    default_compression_codec
FROM system.parts
WHERE table = 'http_logs' AND active = 1
ORDER BY min_time;
```

You will see older parts with ZSTD and newer parts with LZ4, confirming TTL recompression is working.

## Triggering Recompression Immediately

By default, recompression happens during background merges. Force it:

```sql
ALTER TABLE http_logs MATERIALIZE TTL;
```

Or on a specific partition:

```sql
OPTIMIZE TABLE http_logs PARTITION '202301' FINAL;
```

## Monitoring Recompression Merges

```sql
SELECT
    table,
    merge_reason,
    count()           AS merge_count,
    sum(rows)         AS rows_merged,
    sum(bytes_on_disk) AS bytes_before
FROM system.part_log
WHERE merge_reason = 'TTLRecompressMerge'
  AND event_date >= today() - 7
GROUP BY table, merge_reason;
```

## Estimating Compression Savings

Compare compressed sizes before and after:

```sql
SELECT
    toStartOfMonth(min_time) AS month,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size,
    round(sum(data_compressed_bytes) / sum(data_uncompressed_bytes), 3) AS ratio
FROM system.parts
WHERE table = 'http_logs' AND active = 1
GROUP BY month
ORDER BY month;
```

Lower ratios on older months indicate successful recompression.

## Summary

TTL with RECOMPRESS in ClickHouse enables automatic progressive compression of aging data without manual intervention. Combine ZSTD compression tiers with volume moves for a full cold-storage strategy that dramatically reduces long-term storage costs while keeping data queryable via the same table.
