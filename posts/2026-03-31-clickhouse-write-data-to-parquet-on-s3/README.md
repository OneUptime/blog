# How to Write ClickHouse Data to Parquet on S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Parquet, S3, Export, Data Lake, Integration

Description: Export ClickHouse query results and table data to Parquet files on S3 for data lake storage, sharing, or archival purposes.

---

Exporting ClickHouse data to Parquet on S3 is useful for data lake integration, sharing data with other analytics systems, and archiving historical data. ClickHouse supports this natively via the `s3` table function with Parquet format.

## Write a Query Result to Parquet on S3

Use `INSERT INTO FUNCTION s3()` to write query results directly to S3:

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events_2025.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
SELECT *
FROM events
WHERE toYear(event_time) = 2025;
```

## Write Partitioned Parquet Files

For large datasets, write partitioned output using `PARTITION BY`:

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events/year={_partition_id}/',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
PARTITION BY toYear(event_time)
SELECT *
FROM events
WHERE event_time >= '2023-01-01';
```

This creates separate files per year: `year=2023/`, `year=2024/`, `year=2025/`.

## Partition by Month

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events/month={_partition_id}/',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
PARTITION BY toYYYYMM(event_time)
SELECT event_time, event_type, user_id, revenue
FROM events
WHERE event_time >= '2025-01-01';
```

## Compress Parquet Output

ClickHouse writes Parquet with Zstd compression by default. To use a different codec, set the compression method:

```sql
SET output_format_parquet_compression_method = 'snappy';

INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events_2025.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
SELECT * FROM events WHERE toYear(event_time) = 2025;
```

## Tune Parquet Row Groups

Control Parquet row group size for downstream tools:

```sql
SET output_format_parquet_row_group_size = 1000000;
```

Larger row groups compress better but require more memory.

## Write Multiple Files

Split output into multiple files using `PARTITION BY`:

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events_{_partition_id}.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
PARTITION BY toString(toHour(event_time))
SELECT * FROM events WHERE event_date = today();
```

## Scheduled Exports

Automate daily exports using a shell script:

```bash
#!/bin/bash
DATE=$(date -d yesterday +%Y-%m-%d)
clickhouse-client --query="
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/exports/events/date=${DATE}/data.parquet',
    'ACCESS_KEY', 'SECRET_KEY', 'Parquet'
)
SELECT * FROM events WHERE event_date = '${DATE}'
"
```

## Verify the Export

Read the exported file back to verify:

```sql
SELECT count()
FROM s3(
    'https://s3.amazonaws.com/my-bucket/exports/events_2025.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

## Summary

ClickHouse writes data to Parquet on S3 using the `INSERT INTO FUNCTION s3()` syntax. Use `PARTITION BY` to create Hive-compatible partition structures, set compression to Zstd for better storage efficiency, and schedule daily exports for automated data lake hydration.
