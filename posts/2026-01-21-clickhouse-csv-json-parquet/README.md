# How to Load CSV, JSON, and Parquet Files into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CSV, JSON, Parquet, Data Import, S3, File Formats, ETL, Database

Description: A practical guide to importing data from CSV, JSON, and Parquet files into ClickHouse, covering local files, URLs, S3 integration, and the URL and file table functions.

---

ClickHouse can read data directly from files in various formats. Whether your data lives in local files, on a web server, or in S3, ClickHouse can import it efficiently. This guide covers all the common file formats and import methods.

## File Formats Overview

| Format | Speed | Compression | Schema | Best For |
|--------|-------|-------------|--------|----------|
| Native | Fastest | Good | Required | ClickHouse exports |
| Parquet | Very Fast | Excellent | Embedded | Data lakes, analytics |
| ORC | Fast | Excellent | Embedded | Hadoop ecosystem |
| JSONEachRow | Moderate | Poor | Flexible | APIs, logs |
| CSV | Moderate | Poor | Flexible | Simple interchange |
| TSV | Moderate | Poor | Flexible | Tab-delimited data |

## Importing CSV Files

### From Local File

```sql
-- Basic import with header
INSERT INTO events
SELECT *
FROM file('events.csv', 'CSVWithNames');

-- Specify columns explicitly
INSERT INTO events (event_id, event_type, created_at)
SELECT
    toUInt64(col1),
    col2,
    parseDateTimeBestEffort(col3)
FROM file('events.csv', 'CSV');

-- With custom delimiter
SELECT *
FROM file('events.tsv', 'TabSeparatedWithNames');
```

### Handling CSV Quirks

```sql
-- Skip bad rows
SET input_format_allow_errors_ratio = 0.1;  -- Allow 10% errors

-- Custom NULL representation
SET format_csv_null_representation = '\\N';

-- Handle different date formats
SELECT
    parseDateTimeBestEffort(date_column) AS parsed_date
FROM file('data.csv', 'CSVWithNames');

-- Escape character handling
SET format_csv_allow_single_quote = 1;
SET format_csv_delimiter = ',';
```

### CSV Schema Detection

```sql
-- Let ClickHouse infer types
DESCRIBE file('events.csv', 'CSVWithNames');

-- Create table from CSV structure
CREATE TABLE events AS
SELECT *
FROM file('events.csv', 'CSVWithNames')
LIMIT 0;
```

## Importing JSON Files

### JSON Formats

```sql
-- JSONEachRow: One JSON object per line (most common)
-- {"id": 1, "name": "Alice"}
-- {"id": 2, "name": "Bob"}
SELECT * FROM file('events.jsonl', 'JSONEachRow');

-- JSONCompact: Arrays instead of objects
-- [1, "Alice"]
-- [2, "Bob"]
SELECT * FROM file('events.json', 'JSONCompact');

-- JSONStringsEachRow: All values as strings
SELECT * FROM file('events.json', 'JSONStringsEachRow');

-- JSON: Complete JSON array
-- [{"id": 1}, {"id": 2}]
SELECT * FROM file('events.json', 'JSONAsObject');
```

### Handling Nested JSON

```sql
-- Create table with nested structure
CREATE TABLE events
(
    id UInt64,
    user Map(String, String),
    tags Array(String)
)
ENGINE = MergeTree()
ORDER BY id;

-- Import nested JSON
-- {"id": 1, "user": {"name": "Alice", "email": "a@example.com"}, "tags": ["vip", "active"]}
INSERT INTO events
SELECT *
FROM file('events.jsonl', 'JSONEachRow');

-- Or extract during import
INSERT INTO events
SELECT
    JSONExtractUInt(json, 'id') AS id,
    JSONExtractString(json, 'user', 'name') AS user_name,
    JSONExtract(json, 'tags', 'Array(String)') AS tags
FROM file('raw.jsonl', 'JSONAsString') AS t(json);
```

### JSON Schema Inference

```sql
-- Infer schema from JSON
DESCRIBE file('events.jsonl', 'JSONEachRow');

-- Handle inconsistent schemas
SET input_format_json_read_objects_as_strings = 1;
SET input_format_json_try_infer_numbers_from_strings = 1;
```

## Importing Parquet Files

Parquet is the recommended format for large data imports:

```sql
-- Simple import
INSERT INTO events
SELECT *
FROM file('events.parquet', 'Parquet');

-- View Parquet schema
DESCRIBE file('events.parquet', 'Parquet');

-- Select specific columns
SELECT event_id, event_type
FROM file('events.parquet', 'Parquet');
```

### Parquet with Nested Structures

```sql
-- Parquet handles nested data well
SELECT
    event.id AS event_id,
    event.user.name AS user_name,
    event.tags AS tags
FROM file('nested.parquet', 'Parquet');
```

### Parquet Row Groups

```sql
-- Read specific row groups for parallel processing
SELECT *
FROM file('large.parquet', 'Parquet')
SETTINGS
    input_format_parquet_filter_push_down = 1,
    max_threads = 16;
```

## Importing from URLs

### HTTP/HTTPS Sources

```sql
-- Import from URL
INSERT INTO events
SELECT *
FROM url('https://example.com/data/events.csv', 'CSVWithNames');

-- With authentication
SELECT *
FROM url(
    'https://api.example.com/data.json',
    'JSONEachRow',
    'id UInt64, name String',
    headers('Authorization' = 'Bearer token123')
);
```

### Multiple URLs

```sql
-- Glob patterns for multiple files
SELECT *
FROM url('https://example.com/data/events_*.csv', 'CSVWithNames');

-- Multiple specific URLs
SELECT *
FROM url(
    ['https://server1.com/data.csv', 'https://server2.com/data.csv'],
    'CSVWithNames'
);
```

## Importing from S3

### Basic S3 Import

```sql
-- With credentials
INSERT INTO events
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/data.parquet',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'Parquet'
);

-- Using IAM role (no credentials needed)
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/data.parquet',
    'Parquet'
);
```

### S3 Glob Patterns

```sql
-- All Parquet files in a prefix
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/2024-01-*.parquet',
    'key',
    'secret',
    'Parquet'
);

-- Multiple directories
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/{2024-01,2024-02}/*.parquet',
    'key',
    'secret',
    'Parquet'
);

-- All files recursively
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/**/*.parquet',
    'key',
    'secret',
    'Parquet'
);
```

### S3 with Compression

```sql
-- ClickHouse auto-detects compression
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/data.csv.gz',
    'key',
    'secret',
    'CSVWithNames'
);

-- Supported: gzip, bz2, xz, zstd, lz4, brotli
```

### S3 Performance Tuning

```sql
-- Parallel downloads
SET s3_max_connections = 100;
SET s3_max_single_read_retries = 10;

-- Large file handling
SET max_download_buffer_size = 104857600;  -- 100MB

-- Insert with parallelism
INSERT INTO events
SELECT *
FROM s3('s3://bucket/data/*.parquet', 'key', 'secret', 'Parquet')
SETTINGS
    max_threads = 32,
    max_insert_threads = 16;
```

## Creating Tables from Files

### Auto-Create Schema

```sql
-- Create table matching file structure
CREATE TABLE events
ENGINE = MergeTree()
ORDER BY tuple()
AS SELECT *
FROM file('events.parquet', 'Parquet')
LIMIT 0;

-- Then import
INSERT INTO events
SELECT *
FROM file('events.parquet', 'Parquet');
```

### S3 Table Engine

Create a table that reads directly from S3:

```sql
-- S3 as table engine
CREATE TABLE s3_events
(
    event_id UInt64,
    event_type String,
    created_at DateTime
)
ENGINE = S3('https://bucket.s3.amazonaws.com/events/*.parquet', 'key', 'secret', 'Parquet');

-- Query S3 directly
SELECT * FROM s3_events WHERE created_at >= today() - 7;
```

### URL Table Engine

```sql
-- URL as table engine
CREATE TABLE remote_data
(
    id UInt64,
    value Float64
)
ENGINE = URL('https://api.example.com/data.json', 'JSONEachRow');

-- Query refreshes from URL each time
SELECT * FROM remote_data;
```

## Handling Large Imports

### Chunked Processing

```sql
-- Import in chunks for very large files
INSERT INTO events
SELECT *
FROM s3('s3://bucket/huge.parquet', 'key', 'secret', 'Parquet')
SETTINGS
    max_block_size = 100000,
    max_insert_block_size = 100000,
    max_threads = 16;
```

### Progress Monitoring

```sql
-- Enable progress
SET send_progress_in_http_headers = 1;

-- Watch system.processes during import
SELECT query, read_rows, total_rows_approx, elapsed
FROM system.processes
WHERE query LIKE 'INSERT INTO events%';
```

### Error Handling

```sql
-- Skip errors up to limit
SET input_format_allow_errors_num = 1000;
SET input_format_allow_errors_ratio = 0.01;

-- Log errors instead of failing
SET errors_output_format = 'CSV';
```

## Exporting Data

### Export to Files

```sql
-- Export to CSV
INSERT INTO FUNCTION file('export.csv', 'CSVWithNames')
SELECT * FROM events WHERE created_at >= today();

-- Export to Parquet (efficient)
INSERT INTO FUNCTION file('export.parquet', 'Parquet')
SELECT * FROM events;

-- Compressed export
INSERT INTO FUNCTION file('export.csv.gz', 'CSVWithNames')
SELECT * FROM events;
```

### Export to S3

```sql
-- Export to S3
INSERT INTO FUNCTION s3(
    'https://bucket.s3.amazonaws.com/exports/events.parquet',
    'key',
    'secret',
    'Parquet'
)
SELECT * FROM events WHERE created_at >= today();

-- Partitioned export
INSERT INTO FUNCTION s3(
    'https://bucket.s3.amazonaws.com/exports/date={_partition_id}/data.parquet',
    'key',
    'secret',
    'Parquet'
)
SELECT *, toDate(created_at) AS _partition_id
FROM events;
```

## Format Recommendations

### When to Use Each Format

| Use Case | Recommended Format |
|----------|-------------------|
| Data lake interchange | Parquet |
| API responses | JSONEachRow |
| Simple exports | CSV |
| ClickHouse backups | Native |
| Log files | JSONEachRow or TSV |
| Compressed storage | Parquet or ORC |
| Human readable | CSV or JSONEachRow |

### Performance Comparison

```sql
-- Test import speed for different formats
-- Same data, different formats:

-- Parquet: ~2 seconds
INSERT INTO test SELECT * FROM file('data.parquet', 'Parquet');

-- Native: ~1.5 seconds
INSERT INTO test SELECT * FROM file('data.native', 'Native');

-- CSV: ~5 seconds
INSERT INTO test SELECT * FROM file('data.csv', 'CSVWithNames');

-- JSONEachRow: ~8 seconds
INSERT INTO test SELECT * FROM file('data.jsonl', 'JSONEachRow');
```

---

ClickHouse's file import capabilities make it easy to ingest data from anywhere. Use Parquet for large datasets and data lake integration, JSONEachRow for API data, and CSV for simple interchange. For production workloads, prefer S3 with Parquet files and parallel processing for best performance.
