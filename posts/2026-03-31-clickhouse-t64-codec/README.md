# How to Use T64 Codec in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, T64, Database, Performance, Storage

Description: Learn how to use the T64 codec in ClickHouse, which transposes 64-row blocks of integer data to improve compression for low-cardinality and sparse integer columns.

---

T64 is a bit-transposition codec available in ClickHouse for integer and datetime columns. It works by grouping 64 values into a block, placing them into a 64x64 bit matrix, transposing it, and then cropping unused high bits based on the min/max range of values in the block. The result is a compact representation where only the bits needed to distinguish values within the block are stored, improving compression for columns where values cluster in a narrow range.

## How T64 Works

Consider 64 UInt32 values that all fall in the range [1000000, 1000100]. T64 computes the min and max of the block, determines the number of bits needed to represent the range via XOR, and stores only those lower bits after transposition. The upper bits are recorded in a small header for restoration during decompression. The subsequent LZ4 or ZSTD pass then compresses the reduced-entropy output further.

T64 is particularly effective for:

- Low-cardinality integer enums (status codes, category IDs)
- Columns where values cluster in a narrow range
- Monotonically increasing IDs where values in a part share high-order bits

## Supported Types

T64 supports all integer types, their DateTime variants, and several related types:

- `Int8`, `Int16`, `Int32`, `Int64`
- `UInt8`, `UInt16`, `UInt32`, `UInt64`
- `DateTime`, `DateTime64`
- `Date`, `Date32`
- `Enum8`, `Enum16`
- `Decimal32`, `Decimal64`

It does not support `Float32`, `Float64`, or `String`.

## Syntax

```sql
CODEC(T64, LZ4)
CODEC(T64, ZSTD(3))
```

T64 is a specialized compression codec and can be used standalone, but it is recommended to pair it with a general-purpose compressor like LZ4 or ZSTD for best results.

## Basic Example

```sql
CREATE TABLE user_events
(
    user_id    UInt64   CODEC(T64, LZ4),
    event_type UInt8    CODEC(T64, LZ4),
    category   UInt16   CODEC(T64, LZ4),
    score      Int32    CODEC(T64, LZ4),
    ts         DateTime CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
ORDER BY (user_id, ts);
```

## Benchmarking T64 vs Delta

```sql
CREATE TABLE int_delta
(
    id   UInt64  CODEC(Delta(8), LZ4),
    code UInt16  CODEC(Delta(2), LZ4)
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE int_t64
(
    id   UInt64  CODEC(T64, LZ4),
    code UInt16  CODEC(T64, LZ4)
)
ENGINE = MergeTree()
ORDER BY id;

-- Insert clustered values
INSERT INTO int_delta
SELECT
    1000000 + number,
    200 + (number % 50)
FROM numbers(10000000);

INSERT INTO int_t64
SELECT
    1000000 + number,
    200 + (number % 50)
FROM numbers(10000000);
```

Compare compression ratios:

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active = 1
  AND table IN ('int_delta', 'int_t64')
  AND database = currentDatabase()
GROUP BY table
ORDER BY table;
```

## T64 vs Delta: Choosing the Right One

| Scenario | Recommendation |
|----------|---------------|
| Monotonically increasing by 1 | Delta |
| Clustered values in a narrow range | T64 |
| Random integers | T64 may be slightly better |
| Timestamps (sequential) | DoubleDelta or Delta |
| Low-cardinality enums | T64 |

T64 complements Delta. For strictly sequential IDs, Delta wins. For integers that cluster but do not increase monotonically, T64 often outperforms Delta.

## Using T64 with DateTime

```sql
CREATE TABLE sessions
(
    session_id   UInt64   CODEC(T64, LZ4),
    user_id      UInt32   CODEC(T64, LZ4),
    duration_sec UInt32   CODEC(T64, LZ4),
    started_at   DateTime CODEC(T64, LZ4)
)
ENGINE = MergeTree()
ORDER BY (started_at, session_id);
```

When session timestamps are clustered within the same hour or day, T64 strips the shared upper bits, leaving only the time-within-period to compress.

## Inspecting Codec Assignment

```sql
SELECT
    name,
    type,
    compression_codec
FROM system.columns
WHERE table = 'user_events'
  AND database = currentDatabase();
```

## Modifying Codecs on an Existing Table

```sql
ALTER TABLE user_events
    MODIFY COLUMN category UInt16 CODEC(T64, ZSTD(3));

OPTIMIZE TABLE user_events FINAL;
```

## Practical Guidelines

- Use T64 when column values share many high-order bits within the same MergeTree part
- Combine T64 with ZSTD(3) for maximum compression on low-cardinality integers
- Combine T64 with LZ4 when decompression speed matters most
- Benchmark against Delta for your specific dataset, as performance depends on value distribution

## Summary

T64 is a bit-transposition codec that exploits shared high-order bits across groups of 64 rows. It is most effective for integer columns with clustered values or low-cardinality enumerations. Pair it with LZ4 or ZSTD for a complete compression pipeline and always verify ratios with `system.parts`.
