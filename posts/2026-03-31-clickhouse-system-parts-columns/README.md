# How to Use system.parts_columns in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.parts_columns, Storage, Compression, Monitoring

Description: Learn how to use the system.parts_columns table in ClickHouse to inspect per-column storage statistics, compression ratios, and data sizes for each part.

---

The `system.parts_columns` table in ClickHouse extends the information available in `system.parts` by providing per-column breakdowns of storage usage within each data part. It is especially useful for understanding which columns consume the most disk space and for evaluating compression efficiency.

## What Is system.parts_columns?

While `system.parts` gives you aggregate storage info per part, `system.parts_columns` breaks that down to the individual column level. For each column in each active part, it shows compressed size, uncompressed size, the number of rows, and the column type.

## Basic Query

```sql
SELECT
    database,
    table,
    name AS part_name,
    column,
    type,
    rows,
    column_data_compressed_bytes,
    column_data_uncompressed_bytes,
    round(column_data_uncompressed_bytes / column_data_compressed_bytes, 2) AS compression_ratio
FROM system.parts_columns
WHERE table = 'events'
  AND active = 1
ORDER BY column_data_compressed_bytes DESC
LIMIT 20;
```

## Find the Most Storage-Heavy Columns

To identify which columns use the most disk space across all active parts of a table:

```sql
SELECT
    column,
    type,
    sum(column_data_compressed_bytes) AS total_compressed,
    sum(column_data_uncompressed_bytes) AS total_uncompressed,
    round(sum(column_data_uncompressed_bytes) / sum(column_data_compressed_bytes), 2) AS avg_compression_ratio,
    formatReadableSize(sum(column_data_compressed_bytes)) AS compressed_size
FROM system.parts_columns
WHERE table = 'events'
  AND active = 1
GROUP BY column, type
ORDER BY total_compressed DESC;
```

## Evaluate Compression Per Column Type

String columns and high-cardinality columns often compress poorly. This query helps identify candidates for LowCardinality or codec changes:

```sql
SELECT
    column,
    type,
    round(avg(column_data_uncompressed_bytes / column_data_compressed_bytes), 2) AS avg_compression_ratio
FROM system.parts_columns
WHERE database = 'production'
  AND active = 1
GROUP BY column, type
HAVING avg_compression_ratio < 1.5
ORDER BY avg_compression_ratio ASC;
```

## Compare Column Sizes Across Partitions

If your table is partitioned, you can compare how column sizes vary per partition:

```sql
SELECT
    partition,
    column,
    formatReadableSize(sum(column_data_compressed_bytes)) AS compressed
FROM system.parts_columns
WHERE table = 'logs'
  AND active = 1
  AND column IN ('message', 'level', 'service')
GROUP BY partition, column
ORDER BY partition DESC, compressed DESC;
```

## Find Parts With Poorly Compressed Columns

Uncompressed-to-compressed ratios below 1.0 indicate cases where compression actually increased the data size:

```sql
SELECT
    name AS part_name,
    column,
    column_data_compressed_bytes,
    column_data_uncompressed_bytes
FROM system.parts_columns
WHERE table = 'metrics'
  AND active = 1
  AND column_data_compressed_bytes > column_data_uncompressed_bytes;
```

This would reveal cases where compression actually inflated the data, suggesting a codec mismatch.

## Practical Use Cases

- Deciding whether to apply `CODEC(ZSTD)` or `CODEC(Delta, ZSTD)` to specific columns
- Auditing storage after migrating from another database
- Identifying which columns to drop or archive to reduce storage costs
- Verifying that LowCardinality columns are correctly compressing string data

## Summary

`system.parts_columns` is a detailed diagnostic table in ClickHouse that reveals per-column storage and compression statistics for each data part. Use it to optimize codecs, identify wasteful columns, and understand exactly where your storage budget is going at the column level.
