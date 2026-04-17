# How to Chain Multiple Codecs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, Codec, Database, Performance, Optimization

Description: Learn how to chain multiple compression codecs in ClickHouse to combine entropy-reducing transforms with fast compressors for optimal storage efficiency.

---

ClickHouse allows you to specify a pipeline of codecs for each column. Codecs are applied in order during writes and reversed during reads. This enables you to combine entropy-reducing transforms (Delta, DoubleDelta, Gorilla, T64) with compressors (LZ4, ZSTD) to achieve compression ratios that neither approach can match alone.

## Codec Pipeline Mechanics

When writing:

```text
raw data -> codec[0] -> codec[1] -> ... -> disk
```

When reading:

```text
disk -> codec[N-1] -> ... -> codec[0] -> raw data
```

Transform codecs (Delta, DoubleDelta, Gorilla, T64) reduce the entropy of the data stream. Compressor codecs (LZ4, ZSTD) then operate on the reduced-entropy output, achieving much better ratios than they would on the original data.

## Syntax

```sql
CODEC(transform1, transform2, compressor)
CODEC(Delta(4), LZ4)
CODEC(DoubleDelta, ZSTD(3))
CODEC(Gorilla, LZ4)
CODEC(T64, ZSTD(3))
```

## Common Codec Chains

### Timestamps

```sql
ts DateTime CODEC(DoubleDelta, LZ4)
```

DoubleDelta encodes second differences of the timestamp (near-zero for regular intervals), then LZ4 compresses the small numbers.

### Sequential Integers

```sql
order_id UInt64 CODEC(Delta(8), LZ4)
```

Delta stores differences between consecutive IDs. If IDs increment by 1, all deltas are 1 and compress to almost nothing.

### Float Metrics

```sql
cpu_pct Float64 CODEC(Gorilla, LZ4)
```

Gorilla XOR-encodes consecutive floats, stripping shared leading bits. LZ4 then compresses the residuals.

### Low-Cardinality Integers

```sql
category_id UInt16 CODEC(T64, LZ4)
```

T64 transposes bit planes across 64-row blocks, stripping shared high-order bits. LZ4 compresses the output.

## Full Table Example

```sql
CREATE TABLE application_logs
(
    log_id      UInt64        CODEC(Delta(8), LZ4),
    service_id  UInt16        CODEC(T64, LZ4),
    level       UInt8         CODEC(T64, LZ4),
    latency_ms  Float32       CODEC(Gorilla, LZ4),
    message     String        CODEC(ZSTD(3)),
    ts          DateTime64(3) CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (service_id, ts, log_id);
```

Each column uses the codec chain best suited to its data type and access pattern.

## Benchmarking a Codec Chain

Compare an optimized chain against plain ZSTD:

```sql
CREATE TABLE logs_plain
(
    log_id     UInt64   CODEC(ZSTD(3)),
    service_id UInt16   CODEC(ZSTD(3)),
    latency    Float32  CODEC(ZSTD(3)),
    ts         DateTime CODEC(ZSTD(3))
)
ENGINE = MergeTree()
ORDER BY (service_id, ts);

CREATE TABLE logs_chained
(
    log_id     UInt64   CODEC(Delta(8), LZ4),
    service_id UInt16   CODEC(T64, LZ4),
    latency    Float32  CODEC(Gorilla, LZ4),
    ts         DateTime CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
ORDER BY (service_id, ts);

INSERT INTO logs_plain
SELECT
    number,
    number % 20,
    50 + 10 * sin(number / 500.0),
    toDateTime('2024-01-01') + number
FROM numbers(10000000);

INSERT INTO logs_chained
SELECT
    number,
    number % 20,
    50 + 10 * sin(number / 500.0),
    toDateTime('2024-01-01') + number
FROM numbers(10000000);
```

Check results:

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active = 1
  AND table IN ('logs_plain', 'logs_chained')
  AND database = currentDatabase()
GROUP BY table
ORDER BY table;
```

## Stacking Multiple Transforms

You can chain two transforms before the compressor, though this is rarely necessary:

```sql
-- Theoretical example: two transforms + compressor
val UInt64 CODEC(Delta(8), T64, LZ4)
```

In practice, one transform + one compressor is the standard pattern. Adding a second transform rarely improves ratios and increases CPU cost.

## Avoiding Counterproductive Chains

Chains that hurt performance:

```sql
-- Wrong: Gorilla only works on float types
ts DateTime CODEC(Gorilla, LZ4)  -- ClickHouse rejects this with a suspicious codec error (requires allow_suspicious_codecs to override)

-- Wrong: Delta then Gorilla - incompatible types
val Float64 CODEC(Delta, Gorilla, LZ4)

-- Wrong: Two compressors
val String CODEC(ZSTD(3), LZ4)  -- second compressor adds overhead with no benefit
```

Use each transform only on its intended type:

| Transform | Intended types |
|-----------|---------------|
| Delta | Integer, DateTime |
| DoubleDelta | Integer, DateTime |
| Gorilla | Float32, Float64 |
| T64 | Integer, DateTime, Date |

## Inspecting Chains in System Tables

```sql
SELECT
    name,
    type,
    compression_codec
FROM system.columns
WHERE table = 'application_logs'
  AND database = currentDatabase();
```

## Summary

Codec chaining is one of ClickHouse's most powerful storage optimization tools. The pattern is: apply an entropy-reducing transform first, then a fast compressor. Match the transform to the data type: DoubleDelta for timestamps, Delta for sequential integers, Gorilla for floats, T64 for clustered integers. Benchmark with real data using `system.parts` before committing to a schema.
