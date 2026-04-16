# How to Use INTO OUTFILE to Export ClickHouse Query Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, INTO OUTFILE, Export, Data Export

Description: Export ClickHouse query results directly to a file using INTO OUTFILE with CSV, TSV, Parquet, and other formats including compression support.

---

ClickHouse lets you write query results straight to a file by appending `INTO OUTFILE` to any `SELECT` statement. This is useful for data pipelines, backups, and hand-offs to external tools - no intermediate ETL step required.

`INTO OUTFILE` writes the file on the **client side**, where `clickhouse-client` or `clickhouse-local` is running. It is only supported via the command-line client and `clickhouse-local`; queries sent over the HTTP interface will fail.

## Basic Syntax

The minimal form names the output file and uses the `FORMAT` clause to choose the serialization format:

```sql
SELECT
    user_id,
    event_name,
    toDate(timestamp) AS event_date
FROM events
INTO OUTFILE '/tmp/events_export.csv'
FORMAT CSV;
```

The path is resolved on the machine running the client. Relative paths are resolved against the client's current working directory. If the destination file already exists, the query fails unless you specify `APPEND` or `TRUNCATE`.

## Supported Format Options

ClickHouse supports dozens of output formats. The most commonly used ones for file export are:

```sql
-- Comma-separated with header
SELECT id, name, value
FROM my_table
INTO OUTFILE '/tmp/out.csv'
FORMAT CSVWithNames;

-- Tab-separated with header
SELECT id, name, value
FROM my_table
INTO OUTFILE '/tmp/out.tsv'
FORMAT TabSeparatedWithNames;

-- Columnar Parquet (great for analytics pipelines)
SELECT id, name, value
FROM my_table
INTO OUTFILE '/tmp/out.parquet'
FORMAT Parquet;

-- JSON Lines (one JSON object per row)
SELECT id, name, value
FROM my_table
INTO OUTFILE '/tmp/out.jsonl'
FORMAT JSONEachRow;

-- Native ClickHouse binary format (fastest for ClickHouse-to-ClickHouse transfers)
SELECT id, name, value
FROM my_table
INTO OUTFILE '/tmp/out.native'
FORMAT Native;
```

## Compression

Specify a compression codec with the `COMPRESSION` clause to produce compressed files without a separate step. The `COMPRESSION` clause belongs to the `INTO OUTFILE` clause and must appear **before** `FORMAT`:

```sql
-- gzip-compressed CSV
SELECT *
FROM orders
WHERE toYear(created_at) = 2025
INTO OUTFILE '/tmp/orders_2025.csv.gz'
COMPRESSION 'gzip'
FORMAT CSV;

-- LZ4-compressed Parquet
SELECT *
FROM events
INTO OUTFILE '/tmp/events.parquet.lz4'
COMPRESSION 'lz4'
FORMAT Parquet;

-- zstd-compressed TSV
SELECT *
FROM logs
INTO OUTFILE '/tmp/logs.tsv.zst'
COMPRESSION 'zstd'
FORMAT TabSeparated;
```

Supported compression codecs include `none`, `gzip` (alias `gz`), `deflate`, `brotli` (alias `br`), `xz` (alias `lzma`), `zstd` (alias `zst`), `lz4`, and `bz2`. If you omit `COMPRESSION`, ClickHouse auto-detects it from the file extension. You can also control the compression level with `COMPRESSION 'zstd' LEVEL 5`.

## Overwriting Existing Files

By default ClickHouse raises an error if the output file already exists. Use the `TRUNCATE` or `APPEND` clause (part of the `INTO OUTFILE` clause, placed before `COMPRESSION` and `FORMAT`) to control the behavior:

```sql
-- Overwrite the file if it exists
SELECT *
FROM events
INTO OUTFILE '/tmp/daily_export.csv' TRUNCATE
FORMAT CSVWithNames;

-- Append to the file instead of overwriting
SELECT *
FROM events
WHERE toDate(timestamp) = today()
INTO OUTFILE '/tmp/rolling_export.csv' APPEND
FORMAT CSV;
```

Note that `APPEND` is not allowed together with compression.

## Exporting from clickhouse-client

Since `INTO OUTFILE` already writes to a client-side path, you can run it directly through `clickhouse-client`. Plain shell redirection is also an option when you do not need the `INTO OUTFILE`-specific features:

```bash
# Shell redirection - works with any query output
clickhouse-client \
  --query "SELECT * FROM events FORMAT CSVWithNames" \
  > /tmp/events_export.csv

# Compressed via shell pipe
clickhouse-client \
  --query "SELECT * FROM events FORMAT CSVWithNames" \
  | gzip > /tmp/events_export.csv.gz

# INTO OUTFILE writes the file on the client machine
clickhouse-client \
  --query "SELECT * FROM events INTO OUTFILE '/tmp/events.csv' FORMAT CSV"
```

## Practical Export Pipeline Example

```sql
-- Export aggregated daily metrics partitioned by month
SELECT
    toDate(timestamp)          AS day,
    country,
    count()                    AS total_events,
    countIf(status = 'error')  AS error_events,
    avg(duration_ms)           AS avg_duration
FROM events
WHERE toYYYYMM(timestamp) = 202501
GROUP BY day, country
ORDER BY day, country
INTO OUTFILE '/tmp/metrics_202501.parquet'
COMPRESSION 'zstd'
FORMAT Parquet;
```

## Summary

`INTO OUTFILE` turns a `SELECT` query into a direct file export, eliminating the need for shell redirection or a separate copy step. You can choose from CSV, TSV, Parquet, JSONEachRow, Native, and many other formats, and optionally compress the output in the same statement. Remember that the path is resolved on the client side (`clickhouse-client` or `clickhouse-local` - not over HTTP), and use the `APPEND` or `TRUNCATE` clause when you need to handle pre-existing files.
