# How to Export ClickHouse Data to Different File Formats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Export, Data Engineering, Analytics

Description: A comprehensive guide to exporting ClickHouse query results to Parquet, CSV, JSON, Arrow, ORC, and binary formats using INTO OUTFILE, clickhouse-client, and the HTTP interface.

## Overview

ClickHouse provides multiple ways to export data: the `FORMAT` clause in SQL queries, the `INTO OUTFILE` clause for file output, the `clickhouse-client` command-line tool, and the HTTP interface. Most formats can be used for both input and output, though some (like `Pretty`, `Vertical`, and `SQLInsert`) are output-only and others (like `Regexp` and `MySQLDump`) are input-only.

## The FORMAT Clause

Append `FORMAT <name>` to any `SELECT` statement:

```sql
SELECT user_id, event_type, ts
FROM events
LIMIT 1000
FORMAT CSV;
```

This outputs the result to stdout in CSV format.

## INTO OUTFILE

Use `INTO OUTFILE` to write the query result to a file:

```sql
SELECT *
FROM events
WHERE toDate(ts) = today()
INTO OUTFILE '/path/to/exports/events_today.parquet'
FORMAT Parquet;
```

`INTO OUTFILE` is a client-side feature: the file is written on the machine running `clickhouse-client` or `clickhouse-local`, not on the ClickHouse server. It is not supported via the HTTP interface — a query sent over HTTP with `INTO OUTFILE` will fail. To export over HTTP, pipe the response body to a file (see below).

## Exporting via clickhouse-client

Redirect stdout to a file on the client machine:

```bash
clickhouse-client \
  --host my-server \
  --query "SELECT * FROM events FORMAT Parquet" \
  > /local/path/events.parquet
```

With compression:

```bash
clickhouse-client \
  --query "SELECT * FROM events FORMAT Parquet" | \
  zstd > events.parquet.zst
```

## Exporting via the HTTP Interface

Use `curl` to export from the HTTP API:

```bash
# CSV export
curl -G 'http://localhost:8123/' \
  --data-urlencode "query=SELECT * FROM events LIMIT 1000 FORMAT CSV" \
  -o events.csv

# Parquet export
curl -G 'http://localhost:8123/' \
  --data-urlencode "query=SELECT * FROM events FORMAT Parquet" \
  -o events.parquet

# With authentication
curl -G 'http://localhost:8123/' \
  -u 'username:password' \
  --data-urlencode "query=SELECT * FROM events FORMAT JSONEachRow" \
  -o events.ndjson
```

## Exporting to Common Formats

### Parquet (recommended for data lakes)

```sql
SELECT * FROM events
INTO OUTFILE 'events.parquet'
FORMAT Parquet;
```

### ORC (for Hive/Presto ecosystems)

```sql
SELECT * FROM events
INTO OUTFILE 'events.orc'
FORMAT ORC;
```

### Arrow (for Python/Spark pipelines)

```sql
SELECT * FROM events
INTO OUTFILE 'events.arrow'
FORMAT Arrow;
```

### CSV with headers

```sql
SELECT * FROM events
INTO OUTFILE 'events.csv'
FORMAT CSVWithNames;
```

### Tab-separated with schema

```sql
SELECT * FROM events
INTO OUTFILE 'events.tsv'
FORMAT TabSeparatedWithNamesAndTypes;
```

### NDJSON (JSONEachRow)

```sql
SELECT * FROM events
INTO OUTFILE 'events.ndjson'
FORMAT JSONEachRow;
```

### Native (fastest, ClickHouse only)

```sql
SELECT * FROM events
INTO OUTFILE 'events.native'
FORMAT Native;
```

## Exporting to S3

Write export results directly to S3:

```sql
INSERT INTO FUNCTION s3(
    'https://my-bucket.s3.amazonaws.com/exports/events.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
SELECT * FROM events;
```

Partitioned export:

```sql
INSERT INTO FUNCTION s3(
    'https://my-bucket.s3.amazonaws.com/exports/{_partition_id}/data.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
PARTITION BY toYYYYMMDD(ts)
SELECT * FROM events;
```

## Controlling Compression

### Built-in compression for file exports

```sql
SELECT * FROM events
INTO OUTFILE 'events.parquet.zst'
COMPRESSION 'zstd' LEVEL 3
FORMAT Parquet;
```

Supported compression: `none`, `gzip`, `deflate`, `br` (Brotli), `xz`, `zstd`, `lz4`, `bz2`.

### Parquet-level codec (inside the Parquet file)

```sql
SET output_format_parquet_compression_method = 'zstd';

SELECT * FROM events
INTO OUTFILE 'events.parquet'
FORMAT Parquet;
```

## Exporting Large Tables in Parallel

Split by partition key and export in parallel:

```bash
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  clickhouse-client \
    --query "
      SELECT * FROM events
      WHERE toYYYYMM(ts) = 2025${month}
      FORMAT Parquet
    " > events_2025${month}.parquet &
done
wait
echo "All exports complete"
```

## Choosing the Right Export Format

| Use Case | Recommended Format |
|----------|--------------------|
| Data lake (S3/GCS) | Parquet with Zstd |
| Hive/Presto ecosystem | ORC |
| Python analytics pipeline | Arrow or Parquet |
| Spreadsheet / BI tool | CSVWithNames |
| Event streaming | JSONEachRow |
| ClickHouse migration | Native |
| Custom binary pipeline | RowBinary |
| Kafka export | Avro or Protobuf |

## Scheduling Exports

Use a cron job or ClickHouse's scheduled views for recurring exports:

```bash
#!/bin/bash
YESTERDAY=$(date -d yesterday +%Y-%m-%d)
OUTFILE="s3://my-bucket/daily/${YESTERDAY}/events.parquet"

clickhouse-client --query "
  INSERT INTO FUNCTION s3(
    '${OUTFILE}',
    'ACCESS_KEY', 'SECRET_KEY',
    'Parquet'
  )
  SELECT * FROM events
  WHERE toDate(ts) = '${YESTERDAY}'
"
```

## Conclusion

ClickHouse offers unmatched flexibility in export formats. Match your export format to your downstream consumer: Parquet for data lakes, CSV for spreadsheets, Arrow for Python, and Native for ClickHouse-to-ClickHouse transfers. With S3 integration, you can export directly to cloud storage without intermediate local files.

**Related Reading:**

- [How to Use Parquet Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-parquet-format/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)
- [How to Use Native Format in ClickHouse for Best Performance](https://oneuptime.com/blog/post/2026-03-31-clickhouse-native-format/view)
