# How to Query S3 Files with clickhouse-local

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-local, S3, Object Storage, Data Lake

Description: Learn how to query files stored in S3 directly with clickhouse-local using the s3 table function without running a ClickHouse server.

---

## Querying S3 from clickhouse-local

`clickhouse-local` includes the full `s3` table function, allowing you to query Parquet, CSV, JSON, and other files stored in Amazon S3 or S3-compatible storage without a server.

## Basic S3 Query

```bash
clickhouse local --query "
SELECT count(), sum(revenue)
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/orders/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
"
```

## Using Environment Variables for Credentials

```bash
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

clickhouse local --query "
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/*.ndjson',
    'JSONEachRow'
)
LIMIT 10
"
```

## Querying Partitioned S3 Data Lakes

```bash
clickhouse local --query "
SELECT
    toStartOfMonth(event_date) AS month,
    event_type,
    count() AS events
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/year=2024/month=*/part-*.parquet',
    'ACCESS_KEY', 'SECRET_KEY',
    'Parquet'
)
GROUP BY month, event_type
ORDER BY month, events DESC
"
```

## Writing Query Results to S3

```bash
clickhouse local --query "
INSERT INTO FUNCTION s3(
    'https://my-bucket.s3.amazonaws.com/reports/daily_summary.csv',
    'ACCESS_KEY', 'SECRET_KEY',
    'CSVWithNames'
)
SELECT
    toDate(event_time) AS day,
    count() AS events,
    sum(amount) AS revenue
FROM file('local_events.parquet', 'Parquet')
GROUP BY day
ORDER BY day
"
```

## S3-Compatible Storage (MinIO, Cloudflare R2)

```bash
clickhouse local --query "
SELECT count()
FROM s3(
    'http://minio:9000/my-bucket/data/*.csv',
    'minioadmin',
    'minioadmin',
    'CSVWithNames'
)
"
```

## Using IAM Role (Instance Profile)

On EC2 with an instance role, omit credentials:

```bash
clickhouse local --query "
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/sample.parquet',
    'Parquet'
)
LIMIT 100
"
```

## Downloading S3 Files for Local Processing

```bash
# Download to local Parquet, then process locally
clickhouse local --query "
SELECT *
FROM s3('https://my-bucket.s3.amazonaws.com/large_dataset.parquet', 'KEY', 'SECRET', 'Parquet')
" --format Parquet > /tmp/local_copy.parquet

# Now process locally without S3 network latency
clickhouse local --query "
SELECT category, sum(revenue) AS total
FROM file('/tmp/local_copy.parquet', 'Parquet')
GROUP BY category
ORDER BY total DESC
"
```

## Summary

`clickhouse-local` queries S3 files via the `s3()` table function with the same SQL you'd use on local files. It supports partitioned data lakes with glob patterns, writes results back to S3, and works with MinIO and other S3-compatible object stores.
