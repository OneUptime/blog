# How to Use LZ4 Compression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, LZ4, Compression, Storage, Performance

Description: Learn how to apply LZ4 compression to ClickHouse columns and tables to reduce storage usage while maintaining fast read and write performance.

---

## Why LZ4 in ClickHouse

LZ4 is the default compression codec in ClickHouse and offers an excellent balance between compression ratio and speed. It compresses and decompresses data very quickly, making it ideal for high-throughput analytical workloads where minimizing I/O overhead matters.

## Default LZ4 Compression

ClickHouse uses LZ4 by default for all MergeTree tables unless a different codec is specified:

```sql
CREATE TABLE events (
    user_id     UInt64,
    event_type  String,
    ts          DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, ts);
-- Columns default to LZ4 compression
```

## Explicitly Setting LZ4 on Columns

```sql
CREATE TABLE events (
    user_id     UInt64        CODEC(LZ4),
    event_type  String        CODEC(LZ4),
    ts          DateTime      CODEC(LZ4),
    payload     String        CODEC(LZ4HC(9))
) ENGINE = MergeTree()
ORDER BY (user_id, ts);
```

`LZ4HC` is the high-compression variant that trades speed for better compression ratios.

## Applying LZ4 to Existing Columns

```sql
-- Alter an existing column to use LZ4 explicitly
ALTER TABLE events
    MODIFY COLUMN payload String CODEC(LZ4);
```

Note: The change takes effect during the next merge of affected parts.

## Combining LZ4 with Delta Codec

For numeric sequences, combine Delta with LZ4 for better compression:

```sql
CREATE TABLE metrics (
    ts          DateTime      CODEC(Delta, LZ4),
    value       Float64       CODEC(Delta, LZ4),
    host        String        CODEC(LZ4)
) ENGINE = MergeTree()
ORDER BY ts;
```

## Checking Compression Ratios

```sql
SELECT
    table,
    column,
    compression_codec,
    formatReadableSize(data_compressed_bytes) AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE database = 'default'
  AND table = 'events'
ORDER BY data_compressed_bytes DESC;
```

## Checking Table-Level Compression

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE database = 'default' AND active = 1
GROUP BY table
ORDER BY sum(data_compressed_bytes) DESC;
```

## LZ4 vs LZ4HC vs ZSTD

```sql
-- LZ4: fastest, moderate compression
CREATE TABLE test_lz4 (
    data String CODEC(LZ4)
) ENGINE = MergeTree() ORDER BY tuple();

-- LZ4HC(level): slower write, better compression (level 1-12)
CREATE TABLE test_lz4hc (
    data String CODEC(LZ4HC(6))
) ENGINE = MergeTree() ORDER BY tuple();

-- ZSTD: best compression, slower than LZ4
CREATE TABLE test_zstd (
    data String CODEC(ZSTD(1))
) ENGINE = MergeTree() ORDER BY tuple();
```

Typical trade-offs:
- `LZ4`: 2-4x compression, fastest I/O
- `LZ4HC`: 3-5x compression, moderate write overhead
- `ZSTD`: 4-8x compression, higher CPU cost

## Setting Default Compression in config.xml

```xml
<compression>
    <case>
        <method>lz4</method>
    </case>
</compression>
```

## Using LZ4 for HTTP Network Compression

```bash
# Send an LZ4-compressed INSERT payload over HTTP
curl -sS --data-binary @data.lz4 \
    -H "Content-Encoding: lz4" \
    "http://localhost:8123/?query=INSERT%20INTO%20events%20FORMAT%20JSONEachRow"
```

## Summary

LZ4 is the default and most common compression codec in ClickHouse, providing fast compression with reasonable ratios suitable for most analytical workloads. Use explicit `CODEC(LZ4)` declarations when mixing codecs, combine with `Delta` for numeric time series columns, and prefer `LZ4HC` or `ZSTD` only when storage reduction is more critical than write throughput. Monitor compression ratios with `system.columns` and `system.parts`.
