# How to Export ClickHouse Data to S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S3, Export, Data Lake, AWS

Description: Learn how to export ClickHouse tables and query results to Amazon S3 in CSV, Parquet, and JSON formats using the s3 table function.

---

ClickHouse's `s3` table function lets you write query results directly to Amazon S3 without intermediate files, enabling efficient data lake exports and backups.

## Basic Export to S3

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events.csv',
    'YOUR_AWS_ACCESS_KEY',
    'YOUR_AWS_SECRET_KEY',
    'CSVWithNames'
)
SELECT * FROM events
WHERE toDate(ts) = today() - 1;
```

## Using IAM Roles (No Credentials in Query)

On EC2 or ECS with an attached IAM role, omit credentials:

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events.parquet',
    'Parquet'
)
SELECT * FROM events
WHERE toDate(ts) = today() - 1;
```

Configure `use_environment_credentials` for the endpoint in `config.xml`:

```xml
<s3>
  <my_endpoint>
    <endpoint>https://my-bucket.s3.amazonaws.com/</endpoint>
    <use_environment_credentials>true</use_environment_credentials>
  </my_endpoint>
</s3>
```

## Exporting Multiple Files with Partitioning

Use `PARTITION BY` with the `{_partition_id}` placeholder to shard output across multiple files:

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/events/part_{_partition_id}.parquet',
    'Parquet'
)
PARTITION BY rand() % 10
SELECT * FROM events;
```

Alternatively, enable `s3_create_new_file_on_insert = 1` so each INSERT appends an incrementing suffix (`.1`, `.2`, ...) to the filename instead of overwriting.

## Partitioned Export by Date

```bash
#!/bin/bash
d="2026-01-01"
end="2026-03-31"
while [[ "$d" < "$end" || "$d" == "$end" ]]; do
  clickhouse-client --query "
    INSERT INTO FUNCTION s3(
      's3://my-bucket/events/date=${d}/data.parquet',
      'Parquet'
    )
    SELECT * FROM events WHERE toDate(ts) = '${d}'
  "
  d=$(date -I -d "$d + 1 day")
done
```

## Reading Back from S3

Verify the export:

```sql
SELECT count(), min(ts), max(ts)
FROM s3(
    'https://s3.amazonaws.com/my-bucket/exports/events.parquet',
    'Parquet'
);
```

## Export to S3-Compatible Storage (MinIO)

```sql
INSERT INTO FUNCTION s3(
    'http://minio:9000/my-bucket/events.csv',
    'minio_user', 'minio_password',
    'CSVWithNames'
)
SELECT * FROM events LIMIT 10000;
```

## Summary

ClickHouse exports to S3 using `INSERT INTO FUNCTION s3(url, [key, secret,] format)`. Use IAM role-based authentication for production, write Parquet for downstream Spark/Athena compatibility, and use glob patterns to shard large exports into multiple files.
