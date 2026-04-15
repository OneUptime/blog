# How to Use ZSTD Compression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, ZSTD, Database, Performance, Storage

Description: Learn how to apply ZSTD compression codec in ClickHouse to reduce storage size and improve query performance on large datasets.

---

ClickHouse supports multiple compression codecs to balance storage efficiency and query speed. ZSTD (Zstandard) is a modern, general-purpose compression algorithm developed by Facebook. It achieves high compression ratios while maintaining fast decompression speeds, making it an excellent default choice for most ClickHouse workloads.

## What Is ZSTD Compression

ZSTD is a lossless compression algorithm that provides a wide range of compression levels. Higher levels produce smaller files at the cost of more CPU during compression. Decompression speed remains consistently fast across all levels, which matters for read-heavy analytical queries.

In ClickHouse, ZSTD can be applied at two levels:

- **Table-level default** via the `SETTINGS` clause in `CREATE TABLE`
- **Column-level codec** via the `CODEC` annotation on individual columns

## Setting ZSTD as the Table Default

You can configure ZSTD as the default compression for an entire table using the `default_compression_codec` setting:

```sql
CREATE TABLE events
(
    event_id    UInt64,
    user_id     UInt64,
    event_type  String,
    payload     String,
    created_at  DateTime
)
ENGINE = MergeTree()
ORDER BY (created_at, event_id)
SETTINGS default_compression_codec = 'ZSTD';
```

All columns without an explicit codec annotation inherit this default.

## Applying ZSTD Per Column

For more granular control, annotate individual columns with `CODEC(ZSTD)`:

```sql
CREATE TABLE log_entries
(
    log_id      UInt64          CODEC(ZSTD),
    server_id   UInt16          CODEC(ZSTD),
    message     String          CODEC(ZSTD(3)),
    raw_json    String          CODEC(ZSTD(9)),
    ts          DateTime        CODEC(ZSTD)
)
ENGINE = MergeTree()
ORDER BY (ts, log_id);
```

The number inside `ZSTD(level)` controls the compression level:

| Level | Description |
|-------|-------------|
| 1 | Default when no level is specified |
| 3 | Good balance of speed and compression |
| 9 | High compression, slower writes |
| 22 | Maximum compression (rarely needed) |

## Checking Compression Ratios

After inserting data, query `system.columns` to inspect compression ratios:

```sql
SELECT
    name,
    type,
    compression_codec,
    data_compressed_bytes,
    data_uncompressed_bytes,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE table = 'log_entries' AND database = currentDatabase();
```

To see table-wide compression statistics:

```sql
SELECT
    table,
    sum(data_compressed_bytes)   AS compressed,
    sum(data_uncompressed_bytes) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active = 1
  AND table = 'log_entries'
  AND database = currentDatabase()
GROUP BY table;
```

## Benchmark: LZ4 vs ZSTD

Create two identical tables with different codecs to compare:

```sql
CREATE TABLE events_lz4
(
    event_id   UInt64   CODEC(LZ4),
    payload    String   CODEC(LZ4),
    ts         DateTime CODEC(LZ4)
)
ENGINE = MergeTree()
ORDER BY ts;

CREATE TABLE events_zstd
(
    event_id   UInt64   CODEC(ZSTD(3)),
    payload    String   CODEC(ZSTD(3)),
    ts         DateTime CODEC(ZSTD(3))
)
ENGINE = MergeTree()
ORDER BY ts;

-- Insert the same dataset into both tables
INSERT INTO events_lz4  SELECT number, randomString(200), now() - number FROM numbers(5000000);
INSERT INTO events_zstd SELECT number, randomString(200), now() - number FROM numbers(5000000);
```

Compare compressed sizes:

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active = 1
  AND table IN ('events_lz4', 'events_zstd')
  AND database = currentDatabase()
GROUP BY table
ORDER BY table;
```

## Choosing a ZSTD Level

For most production use cases:

- Use `ZSTD(1)` for high-throughput ingestion where write speed matters
- Use `ZSTD(3)` as a balanced default for mixed workloads
- Use `ZSTD(6)` or higher for cold storage archives where you write once and rarely read
- Avoid levels above 9 unless storage cost is a hard constraint

## Altering Existing Tables

You can change the codec on an existing column with `ALTER TABLE`:

```sql
ALTER TABLE log_entries
    MODIFY COLUMN message String CODEC(ZSTD(6));
```

The change applies to new parts written after the alteration. To recompress existing data, use `OPTIMIZE TABLE`:

```sql
OPTIMIZE TABLE log_entries FINAL;
```

## When ZSTD Excels

ZSTD performs best on:

- String columns with repetitive patterns (log messages, JSON payloads, URLs)
- Low-cardinality string columns (status codes, event types)
- Large text blobs

It is less dominant over LZ4 for numeric columns where Delta or DoubleDelta codecs paired with LZ4 or ZSTD outperform ZSTD alone.

## Summary

ZSTD is ClickHouse's most versatile compression codec. It delivers significantly better compression ratios than the default LZ4 with only a modest write overhead. For most production tables, `CODEC(ZSTD(3))` is an excellent starting point. Profile your specific workload, compare ratios in `system.parts`, and tune the level to match your storage and CPU budget.
