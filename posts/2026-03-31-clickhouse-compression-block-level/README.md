# How ClickHouse Compression Works at the Block Level

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, LZ4, ZSTD, Storage, Performance

Description: Learn how ClickHouse compresses columnar data at the block level, which codecs are available, and how to choose the right codec for your data patterns.

---

## Columnar Storage and Compression

ClickHouse stores each column separately. Because each column contains values of the same type (often with repeating or monotonically changing patterns), compression ratios are dramatically better than row-oriented databases.

## Compression Blocks

ClickHouse compresses data in "compression blocks" of roughly 64 KB to 1 MB of uncompressed data (controlled by `min_compress_block_size` default 64 KB and `max_compress_block_size` default 1 MB). Each block is compressed independently, which allows random access - ClickHouse can jump to a specific block and decompress only that block without decompressing everything before it.

## Available Codecs

```sql
CREATE TABLE metrics (
    ts DateTime CODEC(Delta, LZ4),
    value Float64 CODEC(Gorilla, ZSTD(3)),
    label String CODEC(ZSTD(6))
) ENGINE = MergeTree() ORDER BY ts;
```

Key codecs:

- `LZ4` - fast compression and decompression, moderate ratio, good default
- `ZSTD(level)` - higher ratio at the cost of CPU, level 1-22 (default 1)
- `Delta` - stores differences between adjacent values, excellent for timestamps and monotonic counters
- `DoubleDelta` - second-order delta, ideal for slowly changing metrics
- `Gorilla` - XOR-based float compression, excellent for time-series floats
- `T64` - transposes 64 integers before compressing, good for integer columns with low variance

## Codec Chaining

You can chain multiple codecs:

```sql
ts DateTime CODEC(Delta, ZSTD(3))
```

ClickHouse applies `Delta` first (transforms the data into deltas), then `ZSTD` compresses the result. Delta + ZSTD typically achieves 10-20x compression on timestamp columns.

## Checking Compression Ratios

```sql
SELECT
    column,
    sum(data_compressed_bytes) AS compressed,
    sum(data_uncompressed_bytes) AS uncompressed,
    round(uncompressed / compressed, 2) AS ratio
FROM system.columns
WHERE table = 'metrics'
GROUP BY column
ORDER BY ratio DESC;
```

## Changing Column Codecs

```sql
ALTER TABLE metrics MODIFY COLUMN ts CODEC(Delta, LZ4);
```

New parts will use the new codec. Existing parts are not rewritten until you run `OPTIMIZE TABLE metrics FINAL`.

## Default Compression

The server-level default compression can be set in `config.xml`:

```xml
<compression>
    <case>
        <method>zstd</method>
        <level>3</level>
    </case>
</compression>
```

Without a per-column CODEC, columns inherit this server default.

## Summary

ClickHouse compresses columnar data in 64 KB blocks using codecs like LZ4, ZSTD, Delta, DoubleDelta, and Gorilla. Codec chaining lets you apply a data-specific transform before a generic compressor. Choosing the right codec per column type - Delta for timestamps, Gorilla for floats - can reduce storage size by 10x or more while maintaining fast decompression.
