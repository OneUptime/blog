# How to Use Multiple Compression Codecs Together in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, Codec, Storage, MergeTree

Description: Learn how to chain multiple compression codecs in ClickHouse columns to maximize storage savings by combining delta, Gorilla, and LZ4 or ZSTD codecs.

---

## Why Chain Multiple Codecs

ClickHouse allows you to specify a pipeline of codecs for a column. Each codec in the chain processes the output of the previous one. This lets you first reduce value range (e.g., with Delta), then compress the result with a general-purpose algorithm (e.g., LZ4 or ZSTD).

## Codec Pipeline Syntax

```sql
column_name Type CODEC(Codec1, Codec2, ...)
```

Codecs are applied left to right on write, and right to left on read.

## Common Chaining Patterns

### Timestamps - Delta + LZ4

Delta removes the difference between consecutive timestamps, reducing value magnitude before LZ4 compresses:

```sql
CREATE TABLE metrics (
    ts DateTime CODEC(Delta(4), LZ4),
    value Float64,
    host String
) ENGINE = MergeTree()
ORDER BY (host, ts);
```

### Float Metrics - Gorilla + ZSTD

Gorilla XOR encoding for floats followed by ZSTD for high compression ratio:

```sql
CREATE TABLE sensor_data (
    ts DateTime CODEC(Delta(4), LZ4),
    temperature Float64 CODEC(Gorilla, ZSTD(3)),
    humidity Float64 CODEC(Gorilla, ZSTD(3)),
    pressure Float64 CODEC(Gorilla, ZSTD(1))
) ENGINE = MergeTree()
ORDER BY ts;
```

### Integers - Delta + ZSTD

For monotonically increasing integers like sequence IDs:

```sql
CREATE TABLE events (
    event_id UInt64 CODEC(Delta(8), ZSTD(1)),
    user_id UInt32 CODEC(LZ4),
    ts DateTime CODEC(Delta(4), LZ4),
    value Float32 CODEC(Gorilla, ZSTD)
) ENGINE = MergeTree()
ORDER BY (user_id, ts);
```

## High-Compression Codec Chains

You can use `DoubleDelta` with a high-compression general-purpose codec for maximum savings:

```sql
ts DateTime CODEC(DoubleDelta, LZ4HC(9))
```

`DoubleDelta` works well for slowly changing timestamps. `LZ4HC` is the high-compression variant of LZ4. Avoid chaining two general-purpose codecs (e.g., LZ4HC then ZSTD) as compressing already-compressed data yields negligible benefit with extra CPU cost.

## Verify Compression Effectiveness

```sql
SELECT
    column,
    formatReadableSize(data_compressed_bytes) AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE table = 'sensor_data'
ORDER BY data_uncompressed_bytes DESC;
```

## Altering Codecs on Existing Tables

```sql
ALTER TABLE sensor_data
MODIFY COLUMN temperature Float64 CODEC(Gorilla, ZSTD(3));
```

Changes apply to new data parts after the next merge.

## Codec Selection Guide

```text
Monotonic integers/timestamps  -> Delta + LZ4 or ZSTD
Float time-series              -> Gorilla + ZSTD
Slowly changing values         -> DoubleDelta + LZ4
Strings/high-entropy data      -> ZSTD(3) alone
Uncompressible data            -> NONE
```

## Summary

Chaining codecs in ClickHouse lets you apply domain-specific pre-processing (Delta, DoubleDelta, Gorilla) before a general-purpose compressor (LZ4 or ZSTD). The right chain can reduce storage by 5-20x compared to no compression, with minimal query overhead.
