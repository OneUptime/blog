# How to Read Parquet Files from S3 in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Parquet, S3, Data Lake, S3 Table Function, Integration

Description: Read Parquet files from Amazon S3 into ClickHouse using the S3 table function, with filtering, schema inference, and performance tips.

---

Parquet is a columnar storage format widely used in data lakes. ClickHouse can read Parquet files directly from S3 without loading them into local storage, making it easy to query data lake files on demand.

## Basic Parquet Read from S3

Use the `s3` table function with `Parquet` format:

```sql
SELECT *
FROM s3(
    'https://s3.amazonaws.com/my-bucket/events/2025/01/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
LIMIT 100;
```

## Auto Schema Inference

ClickHouse can infer the schema from Parquet metadata:

```sql
DESCRIBE TABLE s3(
    'https://s3.amazonaws.com/my-bucket/events/2025/01/events.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

## Filter Pushdown

ClickHouse pushes WHERE conditions down to the Parquet reader to skip irrelevant row groups, and performs column pruning to read only the columns referenced in the query:

```sql
SELECT
    event_type,
    count() AS cnt,
    uniq(user_id) AS unique_users
FROM s3(
    'https://s3.amazonaws.com/my-bucket/events/2025/01/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
WHERE event_type = 'purchase'
GROUP BY event_type;
```

## Read Partitioned Parquet Data

Use glob patterns to read partition-structured Parquet directories:

```sql
SELECT count()
FROM s3(
    'https://s3.amazonaws.com/my-bucket/events/year=2025/month=*/day=*/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

Enable virtual columns to see partition values:

```sql
SELECT
    _path,
    event_type,
    count()
FROM s3(
    'https://s3.amazonaws.com/my-bucket/events/year=2025/month=01/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
GROUP BY _path, event_type
ORDER BY _path;
```

## Import Parquet Data into ClickHouse

Load Parquet files into a local MergeTree table for fast repeated queries:

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32,
    revenue Decimal(18, 4)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);

INSERT INTO events
SELECT
    event_time,
    event_type,
    user_id,
    revenue
FROM s3(
    'https://s3.amazonaws.com/my-bucket/events/2025/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

## Use Named Collections for Credentials

```sql
CREATE NAMED COLLECTION s3_analytics AS
    access_key_id = 'ACCESS_KEY',
    secret_access_key = 'SECRET_KEY',
    region = 'us-east-1';

SELECT count()
FROM s3(s3_analytics, url='https://s3.amazonaws.com/my-bucket/events/2025/*.parquet', format='Parquet');
```

## Tune Parallel Reads

Increase parallel S3 reads for faster import:

```sql
SET max_threads = 16;
SET max_download_threads = 16;
```

## Summary

ClickHouse reads Parquet files from S3 natively via the `s3` table function. Use glob patterns to read multiple files, leverage auto schema inference for quick exploration, and filter columns for efficiency. For repeated queries, import Parquet data into local MergeTree tables to avoid S3 I/O overhead on every query.
