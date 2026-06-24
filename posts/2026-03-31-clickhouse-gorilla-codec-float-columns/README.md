# How to Use Gorilla Codec in ClickHouse for Float Columns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, Gorilla, Float, TimeSeries, Performance

Description: Learn how to use the Gorilla codec in ClickHouse to compress floating-point time series columns using XOR-based delta encoding for metrics and sensor data.

---

The Gorilla codec in ClickHouse implements the XOR-based float compression algorithm introduced by Facebook's Gorilla time series database (2015). It exploits the fact that consecutive floating-point values in a time series tend to be close together, meaning their XOR produces a value with many leading and trailing zeros. This makes it the most effective codec for float columns in time series workloads.

## How Gorilla Works

Standard double-precision floats use 64 bits. When two consecutive floats are similar in value, their XOR shares many leading zero bits. Gorilla encodes only the meaningful bits of each XOR, dramatically reducing the average bits-per-value. For smooth metrics like CPU percentage or temperature, the compression ratio can exceed 10:1.

The algorithm operates in three steps:

1. XOR each value with the previous value
2. Find the leading and trailing zero counts of the result
3. Encode only the significant middle bits

## Syntax

```sql
CODEC(Gorilla)
CODEC(Gorilla, LZ4)
CODEC(Gorilla, ZSTD(3))
```

Gorilla is a transform codec. It can be used alone or followed by a compressor for additional gains.

## Basic Usage

```sql
CREATE TABLE cpu_metrics
(
    host_id    UInt32   CODEC(LZ4),
    cpu_pct    Float64  CODEC(Gorilla, LZ4),
    iowait_pct Float64  CODEC(Gorilla, LZ4),
    ts         DateTime CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
ORDER BY (host_id, ts);
```

## Float32 vs Float64

Gorilla works on both `Float32` and `Float64`. For sensor data where sub-millisecond precision is not required, `Float32` halves the raw data volume before Gorilla even runs:

```sql
CREATE TABLE sensor_data
(
    sensor_id   UInt32  CODEC(LZ4),
    temperature Float32 CODEC(Gorilla, LZ4),
    pressure    Float32 CODEC(Gorilla, LZ4),
    humidity    Float32 CODEC(Gorilla, LZ4),
    ts          DateTime CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
ORDER BY (sensor_id, ts);
```

## Benchmarking Gorilla Against Plain Compression

```sql
-- Control: plain ZSTD
CREATE TABLE float_zstd
(
    id   UInt32  CODEC(LZ4),
    val  Float64 CODEC(ZSTD(3)),
    ts   DateTime CODEC(Delta(4), LZ4)
)
ENGINE = MergeTree()
ORDER BY (id, ts);

-- Gorilla + LZ4
CREATE TABLE float_gorilla
(
    id   UInt32  CODEC(LZ4),
    val  Float64 CODEC(Gorilla, LZ4),
    ts   DateTime CODEC(Delta(4), LZ4)
)
ENGINE = MergeTree()
ORDER BY (id, ts);

-- Insert smooth oscillating data (similar to real metrics)
INSERT INTO float_zstd
SELECT
    number % 100,
    50 + 10 * sin(number / 100.0),
    toDateTime('2024-01-01') + number
FROM numbers(10000000);

INSERT INTO float_gorilla
SELECT
    number % 100,
    50 + 10 * sin(number / 100.0),
    toDateTime('2024-01-01') + number
FROM numbers(10000000);
```

Compare:

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active = 1
  AND table IN ('float_zstd', 'float_gorilla')
  AND database = currentDatabase()
GROUP BY table
ORDER BY table;
```

Gorilla typically achieves 4-10x better compression than ZSTD alone on smooth float series.

## When Gorilla Underperforms

Gorilla struggles with:

- Completely random floats (no correlation between consecutive values)
- Step-function data with large discrete jumps
- Columns with many NaN or infinity values

For random floats, ZSTD alone is a better choice. Verify with `system.parts` after inserting real data.

## Gorilla for Multiple Metrics in One Table

```sql
CREATE TABLE application_metrics
(
    service_id      UInt16   CODEC(LZ4),
    latency_p50     Float64  CODEC(Gorilla, LZ4),
    latency_p95     Float64  CODEC(Gorilla, LZ4),
    latency_p99     Float64  CODEC(Gorilla, LZ4),
    error_rate      Float32  CODEC(Gorilla, LZ4),
    throughput_rps  Float32  CODEC(Gorilla, LZ4),
    ts              DateTime CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (service_id, ts);
```

## Gorilla Alone vs Gorilla + LZ4

After Gorilla transforms the data, small residual patterns may still compress slightly further with LZ4:

```sql
CREATE TABLE gorilla_only
(
    val Float64 CODEC(Gorilla)
)
ENGINE = MergeTree()
ORDER BY val;

CREATE TABLE gorilla_lz4
(
    val Float64 CODEC(Gorilla, LZ4)
)
ENGINE = MergeTree()
ORDER BY val;
```

The additional LZ4 pass provides a modest improvement (5-15%) at negligible CPU cost. Adding ZSTD after Gorilla rarely provides measurable benefit.

## Altering an Existing Column

```sql
ALTER TABLE cpu_metrics
    MODIFY COLUMN cpu_pct Float64 CODEC(Gorilla, LZ4);

OPTIMIZE TABLE cpu_metrics FINAL;
```

## Summary

Gorilla is the best compression codec for floating-point columns in time series workloads. Pair it with LZ4 for a complete pipeline: Gorilla reduces the entropy of your float values, and LZ4 compresses the output at memory speeds. Always benchmark with `system.parts` against your real data, as compression gains depend on value smoothness.
