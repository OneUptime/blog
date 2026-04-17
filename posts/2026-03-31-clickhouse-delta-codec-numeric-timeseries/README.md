# How to Use Delta Codec in ClickHouse for Numeric Time Series

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, Delta, TimeSeries, Database, Performance

Description: Learn how to use the Delta codec in ClickHouse to achieve superior compression on monotonically increasing numeric and datetime columns in time series tables.

---

The Delta codec is a pre-compression transform available in ClickHouse. Rather than storing raw values, it stores the difference between consecutive values. When data increases gradually and smoothly, differences are small numbers that compress far better than the originals. This makes Delta the go-to codec for timestamps, auto-increment IDs, and other monotonically increasing sequences.

## How Delta Works

Given a sequence like:

```text
100, 102, 105, 107, 110
```

Delta transforms it into:

```text
100, 2, 3, 2, 3
```

Small numbers have fewer significant bits and compress more efficiently with LZ4 or ZSTD. Delta is always paired with a compressor codec because it is a transform, not a compressor.

## Syntax

```sql
CODEC(Delta, LZ4)
CODEC(Delta(bytes), LZ4)
```

The optional `bytes` parameter (1, 2, 4, or 8) specifies the byte width of the delta computation. Match it to the column type:

| Column type | Recommended bytes |
|-------------|-------------------|
| UInt8, Int8 | 1 |
| UInt16, Int16 | 2 |
| UInt32, Int32, Float32, DateTime | 4 |
| UInt64, Int64, Float64, DateTime64 | 8 |

## Applying Delta to a DateTime Column

DateTime is stored internally as a 32-bit Unix timestamp. Consecutive timestamps in a time series are close together, making Delta extremely effective:

```sql
CREATE TABLE server_metrics
(
    server_id  UInt16   CODEC(LZ4),
    cpu_pct    Float32  CODEC(Gorilla, LZ4),
    mem_mb     UInt32   CODEC(Delta(4), LZ4),
    ts         DateTime CODEC(Delta(4), LZ4)
)
ENGINE = MergeTree()
ORDER BY (server_id, ts);
```

## Applying Delta to a DateTime64 Column

`DateTime64` stores values as 64-bit integers. Use `Delta(8)`:

```sql
CREATE TABLE high_res_metrics
(
    metric_id  UInt32      CODEC(LZ4),
    value      Float64     CODEC(ZSTD(3)),
    ts         DateTime64(3) CODEC(Delta(8), LZ4)
)
ENGINE = MergeTree()
ORDER BY (metric_id, ts);
```

## Applying Delta to Auto-Increment IDs

UInt64 row IDs that increment by 1 produce deltas of all 1s, which compress to almost nothing:

```sql
CREATE TABLE orders
(
    order_id     UInt64  CODEC(Delta(8), LZ4),
    customer_id  UInt32  CODEC(LZ4),
    total_cents  UInt64  CODEC(Delta(8), LZ4),
    created_at   DateTime CODEC(Delta(4), LZ4)
)
ENGINE = MergeTree()
ORDER BY (created_at, order_id);
```

## Benchmarking Delta vs Plain LZ4

```sql
-- Without Delta
CREATE TABLE ts_plain
(
    ts   DateTime CODEC(LZ4),
    val  UInt32   CODEC(LZ4)
)
ENGINE = MergeTree()
ORDER BY ts;

-- With Delta
CREATE TABLE ts_delta
(
    ts   DateTime CODEC(Delta(4), LZ4),
    val  UInt32   CODEC(Delta(4), LZ4)
)
ENGINE = MergeTree()
ORDER BY ts;

-- Insert sequential timestamps and incrementing values
INSERT INTO ts_plain
SELECT
    toDateTime('2024-01-01 00:00:00') + number,
    number % 1000
FROM numbers(10000000);

INSERT INTO ts_delta
SELECT
    toDateTime('2024-01-01 00:00:00') + number,
    number % 1000
FROM numbers(10000000);
```

Compare compression:

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active = 1
  AND table IN ('ts_plain', 'ts_delta')
  AND database = currentDatabase()
GROUP BY table
ORDER BY table;
```

You will typically see Delta providing 3-5x better compression on monotonic sequences compared to plain LZ4.

## Delta on Non-Monotonic Data

Delta hurts compression when values jump randomly because differences become large and unpredictable:

```sql
CREATE TABLE random_vals
(
    id  UInt64   CODEC(Delta(8), LZ4),
    rnd Float64  CODEC(LZ4)   -- plain LZ4, no Delta for random floats
)
ENGINE = MergeTree()
ORDER BY id;
```

For random float columns, use Gorilla instead of Delta. Delta is designed for integers and timestamps.

## Inspecting Column Codecs

```sql
SELECT
    name,
    type,
    compression_codec
FROM system.columns
WHERE table = 'server_metrics'
  AND database = currentDatabase();
```

## Altering a Column to Add Delta

```sql
ALTER TABLE server_metrics
    MODIFY COLUMN ts DateTime CODEC(Delta(4), ZSTD(3));

OPTIMIZE TABLE server_metrics FINAL;
```

## Summary

The Delta codec excels on monotonically increasing integer and timestamp columns. Pair it with LZ4 for speed or ZSTD for better ratios. Always match the `bytes` parameter to the column's storage width. Avoid Delta on random or non-sequential data where it will make compression worse.
