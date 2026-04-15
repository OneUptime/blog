# How to Use S3 Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S3, Storage Engine, Object Storage, Data Lake

Description: Learn how to use the S3 table engine in ClickHouse to query files stored in Amazon S3 or S3-compatible storage directly, without loading data into ClickHouse first.

---

The `S3` table engine lets ClickHouse read from and write to files stored in Amazon S3 or any S3-compatible object store (MinIO, GCS with S3 compatibility, Cloudflare R2, etc.). You can query Parquet, CSV, JSON, ORC, Arrow, and other formats directly in S3 as if they were local ClickHouse tables. No data movement is required for reads, making S3 a cost-effective data lake layer that ClickHouse can query on demand.

## Basic S3 Table

```sql
-- Read a CSV file from S3
CREATE TABLE s3_sales_csv
(
    order_id     UInt64,
    customer_id  UInt64,
    product_id   UInt32,
    quantity     UInt32,
    amount       Decimal(10, 2),
    order_date   Date
)
ENGINE = S3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/sales/2024/*.csv',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'CSV',
    'gzip'      -- compression: none, gzip, br, xz, zstd (auto-detected if omitted)
);
```

## Reading Parquet Files

Parquet is the recommended format for analytical workloads due to its columnar layout and built-in compression.

```sql
CREATE TABLE s3_events_parquet
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  String,
    page        String,
    country     String,
    duration_ms UInt32
)
ENGINE = S3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/events/year=2024/month=06/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

## Querying S3 Data

Queries against S3 tables download and decompress only the columns and row groups needed (when using Parquet).

```sql
SELECT
    toDate(event_time) AS event_date,
    event_type,
    count()            AS event_count,
    uniq(user_id)      AS unique_users,
    avg(duration_ms)   AS avg_duration_ms
FROM s3_events_parquet
WHERE event_time BETWEEN '2024-06-01' AND '2024-06-15'
GROUP BY event_date, event_type
ORDER BY event_date DESC, event_count DESC;
```

## Using the s3() Table Function

For one-off queries without a permanent table:

```sql
SELECT count(), max(event_time)
FROM s3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/events/2024/06/15.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

## Glob Patterns for Multiple Files

The S3 engine supports glob patterns to match multiple files.

```sql
-- Query all files across multiple months
SELECT count()
FROM s3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/events/year=2024/month={01..06}/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);

-- Wildcard matching
SELECT sum(revenue)
FROM s3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/sales/2024-*.csv',
    'ACCESS_KEY',
    'SECRET_KEY',
    'CSVWithNames'
);
```

## Writing Data to S3

The S3 engine supports `INSERT` to write data back to S3.

```sql
-- Export a ClickHouse query result to S3 as Parquet
INSERT INTO FUNCTION s3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/exports/daily_summary_20240615.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
SELECT
    event_date,
    country,
    event_type,
    sum(event_count)   AS total_events,
    sum(unique_users)  AS total_users,
    sum(revenue)       AS total_revenue
FROM daily_event_summary
WHERE event_date = yesterday()
GROUP BY event_date, country, event_type;
```

## Using Named Collections for Credentials

Store credentials in a named collection to avoid hardcoding them in queries.

```sql
-- In ClickHouse config (config.d/named_collections.xml):
-- <named_collections>
--   <s3_prod>
--     <access_key_id>AKIA...</access_key_id>
--     <secret_access_key>secret</secret_access_key>
--   </s3_prod>
-- </named_collections>

-- Use the named collection in a query
SELECT count()
FROM s3(
    s3_prod,
    url         = 'https://my-bucket.s3.us-east-1.amazonaws.com/events/*.parquet',
    format      = 'Parquet'
);
```

## Partitioned Writes

Write data into a partitioned S3 path using `PARTITION BY`.

```sql
INSERT INTO FUNCTION s3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/events/{_partition_id}.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
PARTITION BY toYYYYMM(event_date)
SELECT
    event_date,
    user_id,
    event_type,
    revenue
FROM events
WHERE event_date BETWEEN '2024-01-01' AND '2024-06-30';
```

This creates one Parquet file per `YYYYMM` partition, e.g., `202401.parquet`, `202402.parquet`, etc.

## Joining S3 Data With Local Tables

```sql
-- Enrich S3 event data with a local user dimension table
SELECT
    e.event_type,
    u.country,
    u.plan,
    count()          AS events,
    uniq(e.user_id)  AS unique_users
FROM s3_events_parquet AS e
JOIN users AS u ON e.user_id = u.user_id
WHERE e.event_time >= '2024-06-01'
  AND e.event_time <  '2024-07-01'
GROUP BY e.event_type, u.country, u.plan
ORDER BY events DESC
LIMIT 20;
```

## Performance Settings

```sql
-- Increase parallelism for large S3 reads
SELECT count()
FROM s3_events_parquet
SETTINGS
    max_threads                          = 16,
    max_download_threads                 = 16,
    s3_max_connections                   = 100;
```

## Checking S3 File Metadata

```sql
-- List files matched by a glob pattern
SELECT *
FROM s3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/events/2024/06/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
LIMIT 0;  -- schema only, no data download
```

## MinIO and S3-Compatible Storage

```sql
-- MinIO endpoint
CREATE TABLE minio_logs
(
    ts      DateTime,
    level   String,
    message String
)
ENGINE = S3(
    'http://minio:9000/logs/app/*.jsonl',
    'minioadmin',
    'minioadmin',
    'JSONEachRow'
);
```

## Limitations

- No indexes - all reads are full file scans (Parquet row group filtering is an exception).
- Network latency affects query speed; co-locating ClickHouse in the same region as S3 is essential.
- No mutations - data in S3 files cannot be updated in place.
- Writes create new files; there is no compaction or file management.

## Summary

The `S3` engine and `s3()` table function make ClickHouse a powerful query engine for data stored in object storage. Use Parquet files for best performance, glob patterns to target multiple files, and named collections to manage credentials securely. Write results back to S3 for cost-efficient archival, or use S3 as a landing zone before loading into MergeTree for repeated analytical queries.
