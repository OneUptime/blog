# How to Modify Column Compression Codecs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Codec, Compression, ALTER TABLE

Description: Learn how to change column compression codecs in ClickHouse using ALTER TABLE MODIFY COLUMN, compare codec types, and apply changes to existing data.

---

ClickHouse stores column data in compressed binary format. By default it uses LZ4, but you can assign per-column codecs to optimize for storage size, read speed, or write throughput. Changing a codec on an existing column requires `ALTER TABLE MODIFY COLUMN` followed by `OPTIMIZE TABLE ... FINAL` to apply the new codec to existing data parts.

## Available Codec Types

ClickHouse supports several codec families:

- **General-purpose**: `LZ4` (default, fast), `LZ4HC(level)` (higher compression), `ZSTD(level)` (best ratio), `NONE` (no compression).
- **Delta codecs**: `Delta(bytes)` - stores differences between consecutive values, effective for monotonically increasing sequences.
- **Double-delta**: `DoubleDelta` - optimal for slowly changing sequences like timestamps.
- **Gorilla**: `Gorilla` - XOR-based encoding for floating-point time series.
- **FPC**: `FPC(level, float_size)` - specialized floating-point predictor codec.
- **T64**: `T64` - transposes 64-bit integer blocks, good for low-cardinality integers.

Codecs can be chained: the data is passed through each codec in order during compression and in reverse order during decompression.

## Viewing Current Codecs

Check the compression codec assigned to each column:

```sql
SELECT
    name,
    type,
    compression_codec
FROM system.columns
WHERE table = 'metrics' AND database = 'default';
```

## Changing a Column Codec

Use `ALTER TABLE MODIFY COLUMN` with a `CODEC` clause:

```sql
-- Change to ZSTD level 3
ALTER TABLE metrics
    MODIFY COLUMN value Float64 CODEC(ZSTD(3));

-- Chain Delta + LZ4 for monotonically increasing integers
ALTER TABLE metrics
    MODIFY COLUMN timestamp_ms UInt64 CODEC(Delta(8), LZ4);

-- Use DoubleDelta + ZSTD for slowly changing timestamps
ALTER TABLE events
    MODIFY COLUMN event_time DateTime64(3) CODEC(DoubleDelta, ZSTD(1));

-- Remove compression entirely
ALTER TABLE logs
    MODIFY COLUMN raw_message String CODEC(NONE);
```

The `MODIFY COLUMN` statement changes the codec metadata immediately, but existing data parts retain the old codec until they are rewritten.

## Applying Codecs to Existing Data

The `MODIFY COLUMN` statement updates codec metadata, but existing data parts keep the old codec until they are rewritten. Background merges will gradually apply the new codec, but to force an immediate rewrite, use `OPTIMIZE TABLE ... FINAL`:

```sql
OPTIMIZE TABLE metrics FINAL;
```

This forces ClickHouse to merge all parts, rewriting them with the current codec settings. Note that `OPTIMIZE TABLE ... FINAL` can be resource-intensive on large tables since it rewrites all data parts.

You can track merge progress in `system.merges`:

```sql
SELECT
    table,
    progress,
    num_parts,
    result_part_name
FROM system.merges
WHERE table = 'metrics';
```

## Codec Recommendations by Data Type

### Timestamps

```sql
-- DateTime or DateTime64 columns that increase monotonically
ALTER TABLE events
    MODIFY COLUMN event_time DateTime64(3) CODEC(DoubleDelta, LZ4);
```

### Counters and IDs

```sql
-- UInt64 IDs that increase over time
ALTER TABLE requests
    MODIFY COLUMN request_id UInt64 CODEC(Delta(8), LZ4);
```

### Floating-Point Metrics

```sql
-- CPU usage, latency percentiles, temperatures
ALTER TABLE metrics
    MODIFY COLUMN cpu_pct Float32 CODEC(Gorilla, LZ4);

-- Or use FPC for better ratio on some distributions
ALTER TABLE metrics
    MODIFY COLUMN response_time_ms Float64 CODEC(FPC(12, 8), ZSTD(1));
```

### High-Cardinality Strings

```sql
-- Log lines or free-form text benefit from high-ratio compression
ALTER TABLE logs
    MODIFY COLUMN message String CODEC(ZSTD(6));
```

## Defining Codecs at Table Creation

It is best to set codecs at table creation time to avoid needing an `OPTIMIZE TABLE ... FINAL` run later:

```sql
CREATE TABLE metrics (
    event_time  DateTime64(3) CODEC(DoubleDelta, LZ4),
    server_id   UInt32        CODEC(T64, LZ4),
    cpu_pct     Float32       CODEC(Gorilla, LZ4),
    message     String        CODEC(ZSTD(3))
) ENGINE = MergeTree()
ORDER BY (server_id, event_time);
```

## Checking Compression Ratio

After applying a new codec, compare disk usage:

```sql
SELECT
    column,
    sum(column_data_compressed_bytes)   AS compressed_bytes,
    sum(column_data_uncompressed_bytes) AS uncompressed_bytes,
    round(sum(column_data_uncompressed_bytes) / sum(column_data_compressed_bytes), 2) AS ratio
FROM system.parts_columns
WHERE table = 'metrics' AND active = 1
GROUP BY column
ORDER BY compressed_bytes DESC;
```

## Summary

ClickHouse allows per-column compression codecs that can be changed with `ALTER TABLE MODIFY COLUMN ... CODEC(...)`. The codec metadata change is immediate, but existing data parts must be rewritten using `OPTIMIZE TABLE ... FINAL` to gain the new compression. Choose codecs based on data characteristics: `DoubleDelta` for timestamps, `Delta` for counters, `Gorilla` or `FPC` for floating-point time series, and `ZSTD` for high-cardinality strings.
