# How to Import Data from S3 in Various Formats in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S3, Data Engineering, Analytics

Description: Learn how to import data from Amazon S3 into ClickHouse in Parquet, ORC, CSV, JSON, and other formats using the s3 table function, S3 table engine, and partitioned paths.

## Overview

ClickHouse has first-class support for reading data directly from Amazon S3 and S3-compatible storage (MinIO, GCS, Cloudflare R2). You can query S3 data in place using the `s3()` table function, or load it permanently using `INSERT INTO ... SELECT FROM s3(...)`. ClickHouse supports virtually every format over S3.

## The s3() Table Function

The basic syntax:

```sql
s3(url, [access_key, secret_key,] format [, structure] [, compression])
```

- `url` - S3 path, supporting glob patterns
- `format` - any ClickHouse input format
- `structure` - optional column definitions
- `compression` - `auto`, `gzip`, `zstd`, `lz4`, `bz2`, `none`

## Reading Parquet from S3

```sql
SELECT
    event_type,
    count() AS cnt
FROM s3(
    'https://my-bucket.s3.us-east-1.amazonaws.com/events/2025/**/*.parquet',
    'AKIAIOSFODNN7EXAMPLE',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    'Parquet'
)
GROUP BY event_type
ORDER BY cnt DESC;
```

## Reading CSV from S3

```sql
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/uploads/data_*.csv.gz',
    'ACCESS_KEY',
    'SECRET_KEY',
    'CSVWithNames'
)
LIMIT 100;
```

ClickHouse automatically decompresses `.gz`, `.zst`, `.lz4`, and `.bz2` files.

## Reading JSON from S3

```sql
SELECT
    user_id,
    action,
    ts
FROM s3(
    'https://my-bucket.s3.amazonaws.com/logs/2025/01/*.ndjson',
    'ACCESS_KEY',
    'SECRET_KEY',
    'JSONEachRow'
)
WHERE action = 'purchase';
```

## Supported Formats Over S3

| Format | Read | Write |
|--------|------|-------|
| Parquet | Yes | Yes |
| ORC | Yes | Yes |
| Arrow | Yes | Yes |
| Avro | Yes | Yes |
| JSONEachRow | Yes | Yes |
| CSVWithNames | Yes | Yes |
| TabSeparated | Yes | Yes |
| Native | Yes | Yes |
| RowBinary | Yes | Yes |

## Using IAM Roles (No Credentials)

On EC2 instances with an IAM role attached, omit credentials:

```sql
SELECT count()
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/*.parquet',
    'Parquet'
);
```

ClickHouse automatically uses the EC2 instance metadata service to retrieve credentials.

## Defining Credentials in Configuration

Store credentials in `config.xml` to avoid exposing them in queries:

```text
<s3>
    <endpoint-name>
        <endpoint>https://my-bucket.s3.amazonaws.com/</endpoint>
        <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
        <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
    </endpoint-name>
</s3>
```

Then query without inline credentials:

```sql
SELECT * FROM s3('https://my-bucket.s3.amazonaws.com/data/*.parquet', 'Parquet');
```

## Loading S3 Data into a Table

```sql
CREATE TABLE events
(
    event_id   UInt64,
    user_id    UInt32,
    event_type LowCardinality(String),
    ts         DateTime
)
ENGINE = MergeTree()
ORDER BY (ts, user_id);

INSERT INTO events
SELECT event_id, user_id, event_type, ts
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/2025/**/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

## The S3 Table Engine

For ongoing access to S3 data, create a permanent S3-backed table:

```sql
CREATE TABLE s3_events
ENGINE = S3(
    'https://my-bucket.s3.amazonaws.com/events/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);

-- Query it like any other table
SELECT count() FROM s3_events;
```

For read-write access with partitioned output:

```sql
CREATE TABLE s3_events_rw
ENGINE = S3(
    'https://my-bucket.s3.amazonaws.com/events/{_partition_id}/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
PARTITION BY toYYYYMM(ts);
```

## Glob Patterns

ClickHouse supports flexible glob patterns for S3 paths:

| Pattern | Matches |
|---------|---------|
| `*.parquet` | All Parquet files in the directory |
| `**/*.parquet` | All Parquet files recursively |
| `data_{2024,2025}/*.csv` | Both 2024 and 2025 directories |
| `data_2025-{01..12}/*.parquet` | All months in 2025 |
| `shard_{1..4}/data.parquet` | Shards 1 through 4 |

```sql
-- Query all months in 2025
SELECT count()
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/2025-{01..12}/**/*.parquet',
    'Parquet'
);
```

## Partition Pruning with Hive-Style Paths

ClickHouse can prune S3 files using Hive-style partition directories:

```text
s3://my-bucket/events/year=2025/month=01/day=15/data.parquet
```

```sql
SELECT count()
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/**/*.parquet',
    'Parquet'
)
WHERE _path LIKE '%year=2025%month=01%';
```

Or enable the `use_hive_partitioning` setting for automatic partition column extraction:

```sql
SET use_hive_partitioning = 1;

SELECT year, month, count()
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/**/*.parquet',
    'Parquet'
)
GROUP BY year, month;
```

## S3-Compatible Storage

The same syntax works for any S3-compatible storage:

```sql
-- MinIO
SELECT * FROM s3(
    'http://minio:9000/my-bucket/data/*.parquet',
    'minioadmin',
    'minioadmin',
    'Parquet'
);

-- Cloudflare R2
SELECT * FROM s3(
    'https://<account-id>.r2.cloudflarestorage.com/my-bucket/data/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);

-- Google Cloud Storage (interop mode)
SELECT * FROM s3(
    'https://storage.googleapis.com/my-bucket/data/*.parquet',
    'HMAC_KEY',
    'HMAC_SECRET',
    'Parquet'
);
```

## Parallel Reading

ClickHouse reads multiple S3 files in parallel. Control parallelism:

```sql
SET max_threads = 16;
SET max_download_threads = 16;
SET max_download_buffer_size = 10485760; -- 10 MB per thread
```

## Writing Data to S3

```sql
INSERT INTO FUNCTION s3(
    'https://my-bucket.s3.amazonaws.com/exports/events_2025.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
SELECT * FROM events WHERE toYear(ts) = 2025;
```

Write partitioned files:

```sql
INSERT INTO FUNCTION s3(
    'https://my-bucket.s3.amazonaws.com/exports/{_partition_id}/data.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
PARTITION BY toYYYYMM(ts)
SELECT * FROM events;
```

## Conclusion

S3 integration is one of ClickHouse's most powerful features for data lake architectures. You can query petabytes of data in place, load it into ClickHouse for fast analytics, or use S3 as a durable storage tier with the S3 table engine. The format flexibility means you can work with whatever file format your data lake uses.

**Related Reading:**

- [How to Use Parquet Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-parquet-format/view)
- [How to Export ClickHouse Data to Different File Formats](https://oneuptime.com/blog/post/2026-03-31-clickhouse-export-file-formats/view)
- [How to Handle Schema Evolution When Loading Parquet in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-parquet-schema-evolution/view)
