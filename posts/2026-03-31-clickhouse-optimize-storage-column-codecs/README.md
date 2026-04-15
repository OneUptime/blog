# How to Optimize Storage Size with Column Codecs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage Optimization, Column Codec, Compression, MergeTree

Description: Learn how to reduce ClickHouse table storage size by selecting the right per-column codecs based on data type and value distribution patterns.

---

ClickHouse stores data in columnar format, and every column can have its own codec. Choosing the right codec for each column's data type and value distribution can cut storage costs by 50-80% compared to default LZ4.

## How Column Codecs Work

Codecs are applied in two stages. First, an encoding codec transforms the raw values (e.g., Delta stores differences instead of absolute values). Second, a compression codec applies entropy compression (LZ4, ZSTD). You can chain them:

```sql
ALTER TABLE events MODIFY COLUMN timestamp CODEC(Delta, LZ4);
```

## Codec Selection by Data Type

### Timestamps and Monotonically Increasing Integers

Use `Delta` encoding followed by LZ4 or ZSTD. Delta stores the difference between consecutive values, and timestamps are nearly sequential:

```sql
CREATE TABLE metrics (
    ts     DateTime CODEC(Delta, LZ4),
    seq_id UInt64   CODEC(Delta, LZ4),
    ...
) ENGINE = MergeTree() ORDER BY ts;
```

### Float Sensor Data

Use `Gorilla` encoding, which is optimized for slowly-changing floats:

```sql
ALTER TABLE sensor_readings MODIFY COLUMN temperature CODEC(Gorilla, LZ4);
ALTER TABLE sensor_readings MODIFY COLUMN pressure    CODEC(Gorilla, ZSTD(3));
```

### High-Cardinality Strings

Strings compress well with ZSTD at higher levels:

```sql
ALTER TABLE logs MODIFY COLUMN message CODEC(ZSTD(6));
```

### Low-Cardinality Strings

Use `LowCardinality` type combined with LZ4:

```sql
ALTER TABLE events MODIFY COLUMN status LowCardinality(String) CODEC(LZ4);
```

### Boolean and Small Integers

`T64` encodes integer columns by cropping unused high bits based on the min/max value range in each data block, great for columns where values cluster in a narrow range:

```sql
ALTER TABLE events MODIFY COLUMN flags UInt64 CODEC(T64, LZ4);
```

## Applying Codecs to an Existing Table

```sql
-- Change codec on an existing column (applies to new parts)
ALTER TABLE events MODIFY COLUMN created_at CODEC(Delta, ZSTD(3));

-- Force rewrite of all parts to apply the new codec now
OPTIMIZE TABLE events FINAL;
```

## Checking Current Codecs

```sql
SELECT name, type, compression_codec
FROM system.columns
WHERE database = 'default' AND table = 'events'
ORDER BY name
```

## Measuring the Impact

```sql
SELECT
    name,
    formatReadableSize(data_compressed_bytes)   AS on_disk,
    formatReadableSize(data_uncompressed_bytes)  AS logical,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE database = 'default' AND table = 'events'
ORDER BY data_uncompressed_bytes DESC
```

## Codec Chaining Best Practices

```text
Data Pattern              Recommended Chain
-------------------       -----------------
Timestamps                Delta, LZ4
Counter/monotonic int     Delta, LZ4
Float sensor readings     Gorilla, LZ4
Categorical strings       LZ4 or ZSTD(3)
Long text (logs)          ZSTD(6) or ZSTD(9)
Random UUIDs              LZ4 (no transform helps)
```

## Summary

Per-column codecs in ClickHouse let you tailor compression to each column's data pattern. Use `Delta` for monotonically increasing values like timestamps, `Gorilla` for slowly-changing floats, `ZSTD` at higher levels for text, and `LowCardinality` for repeated string values. After changing codecs, run `OPTIMIZE TABLE FINAL` and query `system.columns` to verify the improvement.
