# How to Use LineAsString Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Log, Data Engineering, Parsing

Description: Learn how to use ClickHouse's LineAsString format to ingest raw text files one line at a time, enabling flexible log parsing, regex extraction, and preprocessing pipelines.

## What Is LineAsString?

`LineAsString` is a simple but powerful ClickHouse input format that reads an entire line of text as a single `String` value. No parsing, no type inference, no delimiter detection - just one line per row. This makes it ideal for ingesting raw log files where each line has a complex structure that you want to parse later with SQL functions.

Use cases:
- Raw log ingestion (syslog, access logs, application logs)
- Text file processing before parsing
- Storing raw events for reprocessing
- Inspecting file contents without predefined schema

## Basic Usage

Given an Apache access log `access.log`:

```text
127.0.0.1 - frank [10/Oct/2025:13:55:36 -0700] "GET /index.html HTTP/1.1" 200 2326
10.0.0.5 - alice [10/Oct/2025:13:56:01 -0700] "POST /api/users HTTP/1.1" 201 145
192.168.1.10 - - [10/Oct/2025:13:56:30 -0700] "GET /favicon.ico HTTP/1.1" 404 0
```

Read it with LineAsString:

```sql
SELECT *
FROM file('access.log', LineAsString)
LIMIT 5;
```

Result: one column named `line` of type `String`, one row per line.

## Creating a Raw Log Table

Store raw log lines for later processing:

```sql
CREATE TABLE raw_logs
(
    line       String,
    ingested_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY ingested_at;

INSERT INTO raw_logs (line)
SELECT *
FROM file('access.log', LineAsString);
```

## Parsing Lines with SQL

Once raw lines are in the table, parse them with `extract`, `match`, and JSON functions:

```sql
SELECT
    extract(line, '^(\\S+)') AS client_ip,
    extract(line, '"(GET|POST|PUT|DELETE|PATCH|HEAD)') AS method,
    extract(line, '"\\w+ (\\S+)') AS path,
    toUInt16OrZero(extract(line, '" (\\d{3}) ')) AS status_code,
    toUInt32OrZero(extract(line, '(\\d+)$')) AS bytes_sent
FROM raw_logs
WHERE status_code >= 400
LIMIT 20;
```

## Real-Time Log Ingestion

Pipe log lines directly from a running process:

```bash
tail -f /var/log/nginx/access.log | \
  clickhouse-client \
    --query "INSERT INTO raw_logs (line) FORMAT LineAsString"
```

Or with a named pipe:

```bash
mkfifo /tmp/log_pipe
tail -f /var/log/app/app.log > /tmp/log_pipe &
clickhouse-client \
  --query "INSERT INTO raw_logs (line) FORMAT LineAsString" \
  < /tmp/log_pipe
```

## Ingesting from S3

```sql
INSERT INTO raw_logs (line)
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/logs/2025/01/*.log',
    'ACCESS_KEY',
    'SECRET_KEY',
    'LineAsString'
);
```

## Filtering Lines Before Parsing

Use a materialized view to filter and parse lines as they arrive:

```sql
-- Staging table for raw lines
CREATE TABLE raw_access_logs
(line String)
ENGINE = MergeTree()
ORDER BY tuple();

-- Parsed table
CREATE TABLE access_logs
(
    client_ip   String,
    method      LowCardinality(String),
    path        String,
    status_code UInt16,
    bytes_sent  UInt32,
    log_time    DateTime
)
ENGINE = MergeTree()
ORDER BY log_time;

-- Materialized view parses and filters on insert
CREATE MATERIALIZED VIEW raw_access_logs_mv TO access_logs AS
SELECT
    extract(line, '^(\\S+)')                        AS client_ip,
    extract(line, '"(\\w+) ')                       AS method,
    extract(line, '"\\w+ (\\S+)')                   AS path,
    toUInt16OrZero(extract(line, '" (\\d{3}) '))    AS status_code,
    toUInt32OrZero(extract(line, '(\\d+)$'))        AS bytes_sent,
    parseDateTimeBestEffortOrZero(
        extract(line, '\\[([^\\]]+)\\]')
    )                                               AS log_time
FROM raw_access_logs
WHERE length(line) > 10;
```

## Skipping Empty Lines

ClickHouse includes empty lines as empty strings by default. Filter them out:

```sql
INSERT INTO raw_logs (line)
SELECT line
FROM file('access.log', LineAsString)
WHERE notEmpty(line);
```

## Counting Lines in a File

A quick way to count lines without loading all data:

```sql
SELECT count()
FROM file('large_file.log', LineAsString);
```

## Searching Raw Log Files

Search for patterns across log files without full ingestion:

```sql
SELECT line
FROM file('/var/log/app/*.log', LineAsString)
WHERE line LIKE '%ERROR%'
   OR line LIKE '%FATAL%'
ORDER BY rowNumberInAllBlocks()
LIMIT 100;
```

## LineAsString vs RawBLOB

| Feature | LineAsString | RawBLOB |
|---------|-------------|---------|
| Splits by | Newline | Entire file |
| Output type | String per line | String for whole file |
| Use case | Line-by-line processing | Binary file handling |
| Handles binary | No | Yes |

## Performance Tips

1. Use `LineAsString` for initial ingestion, then parse in a materialized view to avoid double work.
2. For log files with millions of lines, increase `max_insert_block_size` for efficient batching.
3. The `extract()` function uses RE2 regex - compile-once patterns are automatically cached.
4. Use `multiMatchAny()` for checking multiple patterns simultaneously.

## Conclusion

`LineAsString` is the simplest and most flexible ingestion format for unstructured text data. It puts parsing logic in SQL where it can be easily modified, rather than locked inside an ETL script. Combined with materialized views, it creates a powerful pipeline for real-time log analytics.

**Related Reading:**

- [How to Use RawBLOB Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-rawblob-format/view)
- [How to Use JSONEachRow Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-jsoneachrow-format/view)
- [How to Use Template Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-template-format/view)
