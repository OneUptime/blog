# How to Use Delta Codec in ClickHouse for Time-Series Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Delta Codec, Compression, Time-Series, Storage Optimization

Description: Learn how to use the Delta codec in ClickHouse to dramatically reduce storage for monotonically increasing integer and timestamp columns in time-series tables.

---

## What Is the Delta Codec

The Delta codec stores differences between consecutive values instead of the values themselves. For monotonically increasing sequences like timestamps or auto-increment IDs, the deltas are small numbers that compress much better than the original values.

For example, Unix timestamps increment by 1 per second. Storing `1` repeatedly compresses far better than storing `1743408001`, `1743408002`, `1743408003`.

## Applying Delta Codec to a Timestamp Column

```sql
CREATE TABLE metrics (
    ts       DateTime      CODEC(Delta, LZ4),
    host     String        CODEC(LZ4),
    cpu_pct  Float32       CODEC(Delta, LZ4)
) ENGINE = MergeTree()
ORDER BY (host, ts);
```

The `Delta` codec is almost always paired with a secondary codec like `LZ4` or `ZSTD` to compress the small delta values.

## Delta Codec for Integer Columns

```sql
CREATE TABLE access_log (
    request_id  UInt64    CODEC(Delta(8), LZ4),
    ts          DateTime  CODEC(Delta, LZ4),
    status_code UInt16    CODEC(Delta, LZ4),
    bytes_sent  UInt32    CODEC(Delta, LZ4),
    path        String    CODEC(LZ4)
) ENGINE = MergeTree()
ORDER BY (ts, request_id);
```

The optional number in `Delta(N)` specifies byte width: 1, 2, 4, or 8. The default is `sizeof(type)`, so for a `UInt64` column `Delta` alone is equivalent to `Delta(8)`.

## Measuring Compression Improvement

```sql
-- Create two test tables
CREATE TABLE ts_no_delta (
    ts    DateTime,
    value Float32
) ENGINE = MergeTree() ORDER BY ts;

CREATE TABLE ts_with_delta (
    ts    DateTime  CODEC(Delta, LZ4),
    value Float32   CODEC(Delta, LZ4)
) ENGINE = MergeTree() ORDER BY ts;

-- Insert identical test data
INSERT INTO ts_no_delta
    SELECT now() - number, sin(number * 0.01)
    FROM numbers(10000000);

INSERT INTO ts_with_delta
    SELECT now() - number, sin(number * 0.01)
    FROM numbers(10000000);

-- Compare sizes
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE database = 'default'
  AND table IN ('ts_no_delta', 'ts_with_delta')
  AND active = 1
GROUP BY table;
```

## Delta with DoubleDelta for High-Frequency Metrics

For very dense time series (sub-second resolution), use DoubleDelta:

```sql
CREATE TABLE high_freq_metrics (
    ts_ns    UInt64    CODEC(DoubleDelta, LZ4),
    value    Float64   CODEC(Gorilla, LZ4)
) ENGINE = MergeTree()
ORDER BY ts_ns;
```

`DoubleDelta` stores second-order differences and achieves near-perfect compression on regularly spaced timestamps.

## When Delta Codec Helps Most

- Monotonically increasing integers (IDs, auto-increment keys)
- Unix timestamps in seconds or milliseconds
- Event sequence numbers
- Byte counters that grow steadily

## When Delta Codec Does NOT Help

- Random integers with no ordering
- String columns
- Columns already sorted by primary key with large jumps

## Altering an Existing Column

```sql
ALTER TABLE metrics
    MODIFY COLUMN ts DateTime CODEC(Delta, LZ4);
```

The change applies to new parts written after the ALTER. Run `OPTIMIZE TABLE metrics FINAL` to recompress existing data.

## Verifying Codec Assignment

```sql
SELECT
    column,
    compression_codec
FROM system.columns
WHERE database = 'default'
  AND table = 'metrics';
```

## Summary

The Delta codec is one of the most effective compression strategies in ClickHouse for time-series data with monotonically increasing values. Combine it with `LZ4` or `ZSTD` to get the full benefit - Delta reduces the range of values, then LZ4 compresses the small deltas efficiently. For regularly sampled metrics, Delta can reduce timestamp storage by 10x or more compared to raw encoding.
