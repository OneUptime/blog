# How ClickHouse Handles Data Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, LZ4, ZSTD, Delta, Codec, Storage

Description: Explains how ClickHouse compresses column data using encoding and compression codecs in sequence, and how to choose the right codec for different data types.

---

## Two-Stage Compression Pipeline

ClickHouse applies compression in two stages for each column:

1. **Encoding** - domain-specific transformation (Delta, DoubleDelta, Gorilla, T64) that reduces value range
2. **Compression** - general-purpose byte compression (LZ4, ZSTD, LZ4HC, NONE)

Encoding dramatically reduces the entropy of the data before the compressor runs, resulting in much better compression ratios.

## Default Behavior

Without explicit codec specification, ClickHouse uses LZ4 compression for all columns, with no pre-encoding.

```sql
-- Default: LZ4 compression, no encoding
CREATE TABLE events (
  event_time DateTime,
  user_id    UInt64,
  amount     Float64
) ENGINE = MergeTree()
ORDER BY event_time;
```

## Specifying Codecs

```sql
CREATE TABLE events (
  event_time DateTime    CODEC(DoubleDelta, ZSTD(1)),
  user_id    UInt64      CODEC(T64, LZ4),
  amount     Float64     CODEC(Gorilla, ZSTD(3)),
  status     LowCardinality(String)  -- implicit dictionary encoding
) ENGINE = MergeTree()
ORDER BY event_time;
```

## Codec Reference

```text
Codec          | Best For                        | Typical Ratio Gain
---------------|----------------------------------|-------------------
Delta          | Monotonically increasing ints    | 2-5x over LZ4
DoubleDelta    | Timestamps, slowly changing vals | 3-8x over LZ4
Gorilla        | Float metrics, slowly changing   | 2-4x over LZ4
T64            | Integer values in small range    | 2-3x over LZ4
LZ4            | General purpose, fast decode     | Baseline
LZ4HC          | Better ratio, slower write       | 1.2x over LZ4
ZSTD(1-22)     | Best ratio, tunable              | 1.5-2x over LZ4 (level 3)
NONE           | Pre-compressed data              | 1x
```

## Comparing Column Compression Ratios

```sql
SELECT
  column,
  formatReadableSize(data_compressed_bytes) AS compressed,
  formatReadableSize(data_uncompressed_bytes) AS uncompressed,
  round(data_uncompressed_bytes / data_compressed_bytes, 2) AS compression_ratio
FROM system.columns
WHERE table = 'events' AND database = 'analytics'
ORDER BY data_compressed_bytes DESC;
```

## LowCardinality - Dictionary Encoding

Columns with few distinct values benefit from dictionary encoding. `LowCardinality` wrapper applies automatic dictionary encoding.

```sql
CREATE TABLE events (
  event_time DateTime,
  event_type LowCardinality(String),   -- typically < 1000 distinct values
  country    LowCardinality(String),
  status     LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY event_time;
```

LowCardinality reduces storage for string columns with low cardinality by 3-10x and speeds up GROUP BY operations on those columns.

## Changing Codecs on Existing Tables

```sql
-- Change codec for a column (rewrites all parts via mutation)
ALTER TABLE events MODIFY COLUMN amount CODEC(Gorilla, ZSTD(3));

-- Check mutation progress
SELECT table, command, is_done, parts_to_do
FROM system.mutations
WHERE is_done = 0;
```

## Summary

ClickHouse compresses each column independently using a two-stage pipeline: encoding (Delta, DoubleDelta, Gorilla, T64) followed by byte compression (LZ4, ZSTD). Use `DoubleDelta` for timestamps, `Gorilla` for float metrics, `T64` for integer columns, and `LowCardinality` for string columns with few distinct values. ZSTD at level 3 provides the best compression ratio for storage-constrained deployments. Measure compression ratios via `system.columns` before and after changing codecs.
