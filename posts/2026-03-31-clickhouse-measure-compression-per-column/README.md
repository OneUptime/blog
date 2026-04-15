# How to Measure Compression Effectiveness per Column in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, Storage, system.columns, Analytics

Description: Learn how to measure and analyze compression effectiveness for each column in ClickHouse tables using system tables to identify optimization opportunities.

---

## Why Measure Per-Column Compression

Different columns compress differently based on data type, cardinality, and value distribution. Measuring per-column compression helps you identify columns wasting the most space and target them for codec changes.

## Query system.columns for Compression Stats

```sql
SELECT
    database,
    table,
    column,
    type,
    formatReadableSize(data_compressed_bytes) AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio,
    compression_codec
FROM system.columns
WHERE database = 'default'
  AND table = 'events'
ORDER BY data_uncompressed_bytes DESC;
```

## Find Columns with Poor Compression

```sql
SELECT
    table,
    column,
    type,
    compression_codec,
    formatReadableSize(data_compressed_bytes) AS compressed,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE database = 'default'
  AND ratio < 1.5
ORDER BY data_compressed_bytes DESC
LIMIT 20;
```

Columns with ratio below 1.5x are poor compression candidates or already use efficient codecs.

## Identify Top Space Consumers

```sql
SELECT
    column,
    type,
    compression_codec,
    formatReadableSize(data_compressed_bytes) AS compressed,
    round(100 * data_compressed_bytes / sum(data_compressed_bytes) OVER (), 2) AS pct_of_total
FROM system.columns
WHERE database = 'default' AND table = 'events'
ORDER BY data_compressed_bytes DESC;
```

## Compare Codec Effectiveness

Create parallel tables with different codecs and compare:

```sql
SELECT
    table,
    column,
    compression_codec,
    formatReadableSize(data_compressed_bytes) AS compressed,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE table IN ('events_lz4', 'events_zstd', 'events_gorilla')
ORDER BY column, table;
```

## Aggregate by Table

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes)) AS total_compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS total_uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS overall_ratio
FROM system.columns
WHERE database = 'default'
GROUP BY table
ORDER BY sum(data_compressed_bytes) DESC;
```

## Cross-Partition Analysis via system.parts_columns

For more granular control:

```sql
SELECT
    column,
    sum(column_data_compressed_bytes) AS compressed,
    sum(column_data_uncompressed_bytes) AS uncompressed,
    round(sum(column_data_uncompressed_bytes) / sum(column_data_compressed_bytes), 2) AS ratio
FROM system.parts_columns
WHERE table = 'events'
  AND active = 1
GROUP BY column
ORDER BY compressed DESC;
```

## Optimize Based on Findings

After identifying poor-ratio columns, update codecs:

```sql
-- Float column with low ratio: switch to Gorilla + ZSTD
ALTER TABLE events
MODIFY COLUMN value Float64 CODEC(Gorilla, ZSTD(1));

-- Timestamp with low ratio: switch to Delta + LZ4
ALTER TABLE events
MODIFY COLUMN ts DateTime CODEC(Delta(4), LZ4);
```

## Summary

Use `system.columns` to measure per-column compression ratios in ClickHouse. Columns with ratios below 2x are candidates for codec improvements. Target large, poorly compressed columns first for the greatest storage savings, and always verify with `OPTIMIZE FINAL` before drawing conclusions.
