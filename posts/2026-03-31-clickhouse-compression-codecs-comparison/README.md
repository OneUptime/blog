# ClickHouse Compression Codecs Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, Codec, LZ4, ZSTD, Delta, Gorilla, Feature Comparison

Description: A side-by-side feature comparison of all ClickHouse compression codecs - LZ4, ZSTD, Delta, DoubleDelta, Gorilla, T64, and more - with ratios, speed, and use cases.

---

## ClickHouse Codec Pipeline

ClickHouse compresses column data in two stages: an optional encoding step that reduces data entropy, followed by a byte compression step. Multiple codecs can be chained.

```sql
-- Syntax: CODEC(encoder, compressor)
CREATE TABLE metrics (
  ts     DateTime   CODEC(DoubleDelta, ZSTD(1)),
  value  Float64    CODEC(Gorilla, LZ4)
) ENGINE = MergeTree() ORDER BY ts;
```

## Encoding Codecs

Encoding codecs transform the data before byte compression. They do not reduce size alone but make the output much more compressible.

```text
Codec         | Input Type      | Algorithm           | Best For
--------------|-----------------|---------------------|-----------------------------
Delta         | Integer, Date   | Stores differences  | Monotonic integers, counters
DoubleDelta   | Integer, Date   | Second-order delta  | Timestamps, slowly-changing
Gorilla       | Float32/64      | XOR of consecutive  | Metrics, slow float changes
T64           | Integer         | Transpose 64-bit    | Dense integer ranges
FPC           | Float64         | Floating-point pred | High-precision floats
```

## Byte Compression Codecs

These reduce byte size after encoding and can also be used standalone.

```text
Codec      | Speed (compress) | Speed (decompress) | Ratio | Best For
-----------|------------------|---------------------|-------|---------------------------
NONE       | N/A              | N/A                 | 1x    | Pre-compressed data
LZ4        | Very fast        | Very fast           | 2-4x  | General, latency-sensitive
LZ4HC(9)   | Slow             | Very fast           | 3-5x  | Better ratio, rare writes
ZSTD(1)    | Fast             | Fast                | 3-6x  | Good default balance
ZSTD(3)    | Medium           | Fast                | 4-7x  | Storage-constrained
ZSTD(19)   | Very slow        | Fast                | 5-9x  | Maximum compression
```

## Combining Encoding + Compression

```sql
-- Timestamps: DoubleDelta compresses monotonic deltas, then ZSTD reduces further
event_time DateTime CODEC(DoubleDelta, ZSTD(1))

-- Integer counters: Delta + LZ4 for fast encode/decode
page_views UInt64  CODEC(Delta, LZ4)

-- Float metrics: Gorilla XOR + LZ4 for slow-changing floats
cpu_percent Float32 CODEC(Gorilla, LZ4)

-- High-cardinality strings: just ZSTD
request_url String  CODEC(ZSTD(3))

-- Low-cardinality strings: LowCardinality handles dict encoding
status LowCardinality(String)  -- no explicit codec needed
```

## Compression Ratio Example

Actual ratios depend heavily on data. Typical for a 100M row time-series table:

```text
Column type      | No codec | LZ4  | DoubleDelta+ZSTD | Savings
-----------------|----------|------|------------------|--------
DateTime (monot) | 800MB    | 200MB | 12MB            | 98%
UInt64 (counter) | 800MB    | 400MB | 80MB            | 90%
Float64 (metric) | 800MB    | 600MB | 120MB           | 85%
String (URL)     | 2GB      | 800MB | 600MB           | 70%
```

## Checking Column Compression Ratios in Production

```sql
SELECT
  column,
  formatReadableSize(data_compressed_bytes) AS compressed,
  formatReadableSize(data_uncompressed_bytes) AS uncompressed,
  round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE table = 'your_table'
ORDER BY data_compressed_bytes DESC;
```

## Summary

For timestamps and monotonic integers, `DoubleDelta` or `Delta` combined with `ZSTD(1)` delivers the best compression. For slowly-changing float metrics, `Gorilla + LZ4` gives fast decode with good compression. For general-purpose columns, `ZSTD(3)` is a solid choice. Use `LZ4` when decode latency matters more than storage savings. Use `LowCardinality` for string columns with fewer than 10,000 distinct values - it uses dictionary encoding automatically.
