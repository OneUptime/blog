# How to Use s3() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, S3, AWS, Cloud, Database, ETL

Description: Learn how to use the s3() table function in ClickHouse to read, write, and query data stored in Amazon S3 and S3-compatible object stores using SQL.

---

The `s3()` table function in ClickHouse gives you direct SQL access to data stored in Amazon S3 and any S3-compatible object store (MinIO, Cloudflare R2, GCS interop, and others). You can query S3 files without importing them first, stream query results back to S3, and process entire prefixes in one query using glob patterns.

## What Is the s3() Table Function?

`s3()` exposes S3 objects as virtual tables. Under the hood, ClickHouse downloads (or streams) the objects and applies your SQL predicates, aggregations, and joins. This is often called "external table" or "data lake query" functionality.

```sql
SELECT count()
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/2026/03/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet',
    'user_id UInt64, event_type String, ts DateTime'
);
```

## Basic Syntax

```sql
s3(url, [access_key_id, secret_access_key,] format, structure [, compression])
```

| Parameter          | Description |
|--------------------|-------------|
| `url`              | S3 path in `https://bucket.s3.region.amazonaws.com/prefix/file` format, supports globs |
| `access_key_id`    | AWS access key (omit to use IAM role or config) |
| `secret_access_key`| AWS secret key |
| `format`           | `CSV`, `TSV`, `JSONEachRow`, `Parquet`, `ORC`, `Arrow`, etc. |
| `structure`        | Column definitions |
| `compression`      | `gzip`, `zstd`, `brotli`, `xz`/`LZMA`, `none` (default: auto-detected from file extension) |

## Reading CSV Files from S3

```sql
SELECT
    order_id,
    product,
    amount,
    toDate(created_at) AS order_date
FROM s3(
    'https://my-data-bucket.s3.us-east-1.amazonaws.com/orders/2026/*.csv',
    'myAccessKeyId',
    'mySecretAccessKey',
    'CSVWithNames',
    'order_id UInt64, product String, amount Float64, created_at DateTime'
)
WHERE amount > 100
ORDER BY order_date DESC
LIMIT 100;
```

## Reading Parquet Files from S3

Parquet is the preferred format for analytics workloads because ClickHouse can push column projections into the file reader:

```sql
SELECT
    host,
    avg(cpu_usage) AS avg_cpu,
    max(mem_usage) AS peak_mem,
    toStartOfHour(ts) AS hour
FROM s3(
    'https://metrics-bucket.s3.eu-west-1.amazonaws.com/host_metrics/2026/03/*/metrics.parquet',
    'myAccessKeyId',
    'mySecretAccessKey',
    'Parquet',
    'host String, cpu_usage Float32, mem_usage Float32, ts DateTime'
)
GROUP BY host, hour
ORDER BY hour, host;
```

## Using IAM Roles (No Credentials in Query)

When ClickHouse runs on an EC2 instance with an attached IAM role, omit the credentials:

```sql
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/*.csv',
    'CSVWithNames',
    'id UInt64, name String, value Float64'
)
LIMIT 10;
```

## Glob Patterns for Multiple Files

```sql
-- All files in March 2026
SELECT count()
FROM s3(
    'https://logs-bucket.s3.amazonaws.com/app-logs/2026-03-*.jsonl',
    'myAccessKeyId',
    'mySecretAccessKey',
    'JSONEachRow',
    'ts DateTime, level String, message String'
);

-- Recursive: all parquet files under a prefix
SELECT count()
FROM s3(
    'https://data-lake.s3.amazonaws.com/events/**/*.parquet',
    'myAccessKeyId',
    'mySecretAccessKey',
    'Parquet',
    'user_id UInt64, event String, ts DateTime'
);
```

## Writing Results Back to S3

Use `INSERT INTO FUNCTION s3(...)` to export query results directly to S3:

```sql
INSERT INTO FUNCTION s3(
    'https://output-bucket.s3.amazonaws.com/reports/monthly_sales_2026_03.parquet',
    'myAccessKeyId',
    'mySecretAccessKey',
    'Parquet',
    'month Date, product String, total_sales Float64'
)
SELECT
    toStartOfMonth(order_date) AS month,
    product,
    sum(amount)                AS total_sales
FROM orders
WHERE toYear(order_date) = 2026 AND toMonth(order_date) = 3
GROUP BY month, product
ORDER BY month, product;
```

## Importing S3 Data into ClickHouse

For repeated queries, load S3 data into a MergeTree table to benefit from indexing:

```sql
CREATE TABLE app_events
(
    ts         DateTime,
    user_id    UInt64,
    event_type String,
    properties String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);

INSERT INTO app_events
SELECT *
FROM s3(
    'https://events-bucket.s3.amazonaws.com/raw/2026/03/*.parquet',
    'myAccessKeyId',
    'mySecretAccessKey',
    'Parquet',
    'ts DateTime, user_id UInt64, event_type String, properties String'
);
```

## Using S3 with MinIO (S3-Compatible)

Point the URL at your MinIO endpoint instead of AWS:

```sql
SELECT *
FROM s3(
    'http://minio.internal:9000/my-bucket/data/events.csv',
    'minioAccessKey',
    'minioSecretKey',
    'CSVWithNames',
    'id UInt64, event String, ts DateTime'
)
LIMIT 10;
```

## Setting S3 Credentials Globally

Instead of putting credentials in every query, define them in `config.xml` under a named access key:

```xml
<s3>
    <endpoint-s3>
        <endpoint>https://my-bucket.s3.amazonaws.com/</endpoint>
        <access_key_id>myAccessKeyId</access_key_id>
        <secret_access_key>mySecretAccessKey</secret_access_key>
    </endpoint-s3>
</s3>
```

Then queries against that bucket use the configured credentials automatically.

## Compression

ClickHouse auto-detects compression from the file extension. You can also specify it explicitly:

```sql
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/events.csv.gz',
    'myAccessKeyId',
    'mySecretAccessKey',
    'CSV',
    'id UInt64, event String, ts DateTime',
    'gzip'
);
```

## Performance Tuning

```sql
-- Increase parallelism for large S3 queries
SET max_threads = 16;

-- Increase part upload size for exports (bytes)
SET s3_min_upload_part_size = 67108864; -- 64 MB

-- Increase the number of upload threads
SET s3_upload_part_size_multiply_factor = 2;
SET s3_upload_part_size_multiply_parts_count_threshold = 500;
```

## Hive-Style Partitioning

ClickHouse can read Hive-partitioned S3 layouts and expose partition keys as queryable columns derived from the path:

```sql
SELECT
    year,
    month,
    count(),
    sum(revenue)
FROM s3(
    'https://data-lake.s3.amazonaws.com/sales/year=*/month=*/*.parquet',
    'myAccessKeyId',
    'mySecretAccessKey',
    'Parquet',
    'order_id UInt64, revenue Float64'
)
GROUP BY year, month;
```

## Summary

The `s3()` table function makes ClickHouse a capable data lake query engine. Key points:

- Read CSV, Parquet, ORC, JSON, and other formats directly from S3 with standard SQL.
- Use glob patterns to query entire prefixes in one query.
- Export results back to S3 with `INSERT INTO FUNCTION s3(...)`.
- Use IAM roles to avoid embedding credentials in queries.
- For repeated queries, load data into MergeTree tables for index-accelerated performance.
