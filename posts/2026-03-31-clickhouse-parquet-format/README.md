# How to Use Parquet Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Parquet, Data Engineering, Analytics

Description: Learn how to read, write, and query Parquet files in ClickHouse with practical examples covering compression, schema mapping, and performance tips.

## What Is Parquet?

Apache Parquet is a columnar storage format originally designed for the Hadoop ecosystem. It stores data column by column rather than row by row, which makes it an excellent match for ClickHouse's own columnar storage engine. Parquet files are widely used in data lakes, and ClickHouse can read and write them natively without any additional plugins.

Key advantages of Parquet:
- Efficient column pruning during queries
- Strong compression (Snappy, Gzip, Zstd, LZ4, Brotli)
- Rich type system including nested structures
- Broad ecosystem support (Spark, Pandas, DuckDB, BigQuery)

## Reading a Parquet File

Given a local Parquet file named `events.parquet`, you can query it directly without importing:

```sql
SELECT *
FROM file('events.parquet', Parquet)
LIMIT 10;
```

ClickHouse infers the schema automatically. To inspect the inferred schema:

```sql
DESCRIBE file('events.parquet', Parquet);
```

## Creating a Table from Parquet

To load Parquet data into a permanent MergeTree table:

```sql
CREATE TABLE events
(
    event_id   UInt64,
    user_id    UInt32,
    event_type String,
    ts         DateTime,
    properties String
)
ENGINE = MergeTree()
ORDER BY (ts, user_id);

INSERT INTO events
SELECT *
FROM file('events.parquet', Parquet);
```

## Writing Data to Parquet

Export any ClickHouse query result to a Parquet file:

```sql
SELECT
    user_id,
    count()          AS total_events,
    max(ts)          AS last_seen
FROM events
GROUP BY user_id
INTO OUTFILE 'user_summary.parquet'
FORMAT Parquet;
```

On the command line using `clickhouse-client`:

```bash
clickhouse-client \
  --query "SELECT * FROM events FORMAT Parquet" \
  > events_export.parquet
```

## Using Parquet with the S3 Table Function

ClickHouse can read Parquet files directly from Amazon S3 or any S3-compatible storage:

```sql
SELECT
    event_type,
    count() AS cnt
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/events/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
GROUP BY event_type
ORDER BY cnt DESC;
```

Glob patterns let you query an entire folder of partitioned Parquet files in one statement.

## Controlling Compression

When exporting, choose a codec with the `output_format_parquet_compression_method` setting:

```sql
SET output_format_parquet_compression_method = 'zstd';

SELECT * FROM events
INTO OUTFILE 'events_zstd.parquet'
FORMAT Parquet;
```

Available codecs: `zstd` (default), `snappy`, `gzip`, `lz4`, `brotli`, `none`.

## Type Mapping

| ClickHouse Type | Parquet Type |
|-----------------|--------------|
| UInt8 / Int8    | INT32 (INT_8) |
| UInt32 / Int32  | INT32 |
| UInt64 / Int64  | INT64 |
| Float32         | FLOAT |
| Float64         | DOUBLE |
| String          | BYTE_ARRAY (UTF8) |
| Date            | INT32 (DATE) |
| DateTime        | INT64 (TIMESTAMP_MILLIS) |
| Array(T)        | LIST |
| Nullable(T)     | optional field |

## Handling Nested Columns

Parquet supports nested structures through its `LIST` and `MAP` types. ClickHouse maps them to `Array` and `Map` types:

```sql
SELECT
    user_id,
    properties['browser'] AS browser
FROM file('events.parquet', Parquet)
WHERE notEmpty(properties['browser']);
```

ClickHouse automatically handles nested Parquet structures including repeated groups (lists of structs) without any special settings.

## Performance Tips

1. **Partition your Parquet files by date** so ClickHouse can skip irrelevant files with `WHERE` filters.
2. **Increase the row group size** when writing from external tools. Larger row groups reduce metadata overhead.
3. **Use Zstd compression** for a good balance of speed and size.
4. **Project only needed columns** - ClickHouse will push column pruning into the Parquet reader, avoiding unnecessary IO.

```sql
-- Only reads user_id and ts columns from the Parquet file
SELECT user_id, ts
FROM file('events.parquet', Parquet)
WHERE ts >= '2025-01-01';
```

## Conclusion

Parquet is one of the most capable formats for exchanging analytical data with ClickHouse. Its columnar layout aligns naturally with ClickHouse's internals, compression reduces storage and network costs, and the rich type system covers nearly every use case. Use it whenever you need to integrate ClickHouse with a broader data lake ecosystem.

**Related Reading:**

- [How to Use ORC Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-orc-format/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)
- [How to Handle Schema Evolution When Loading Parquet in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-parquet-schema-evolution/view)
