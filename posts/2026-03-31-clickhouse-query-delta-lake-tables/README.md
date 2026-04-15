# How to Query Delta Lake Tables from ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Delta Lake, Data Lake, S3, Parquet, Integration

Description: Query Delta Lake tables stored on S3 or Azure Data Lake Storage directly from ClickHouse using the deltaLake table function.

---

Delta Lake is an open-source storage format built on Parquet that adds ACID transactions to data lakes. ClickHouse supports reading Delta Lake tables via the `deltaLake` table function and `DeltaLake` table engine.

## Prerequisites

Delta Lake tables must be stored on S3-compatible storage accessible from ClickHouse. Ensure your ClickHouse instance has S3 credentials configured.

## Reading a Delta Lake Table

Use the `deltaLake` table function to query a Delta Lake table on S3:

```sql
SELECT *
FROM deltaLake('s3://my-bucket/delta-tables/events/', 'ACCESS_KEY', 'SECRET_KEY')
LIMIT 100;
```

## Query with Filters

Predicates are pushed down to the Delta Lake log for efficient partition pruning:

```sql
SELECT
    event_type,
    count() AS event_count
FROM deltaLake('s3://my-bucket/delta-tables/events/', 'ACCESS_KEY', 'SECRET_KEY')
WHERE event_date >= '2025-01-01'
GROUP BY event_type
ORDER BY event_count DESC;
```

## Create a ClickHouse Table Backed by Delta Lake

The `DeltaLake` engine creates a table that reads from a Delta Lake table:

```sql
CREATE TABLE events_delta
ENGINE = DeltaLake('s3://my-bucket/delta-tables/events/', 'ACCESS_KEY', 'SECRET_KEY');
```

Query it like any regular table:

```sql
SELECT count() FROM events_delta;
```

## Using Named Collections for Credentials

Avoid hardcoding credentials by using named collections:

```sql
CREATE NAMED COLLECTION s3_creds AS
    access_key_id = 'ACCESS_KEY',
    secret_access_key = 'SECRET_KEY';

SELECT *
FROM deltaLake(s3_creds, url='s3://my-bucket/delta-tables/events/')
LIMIT 10;
```

## Querying Azure Data Lake Storage

For Delta Lake on Azure, use the `deltaLakeAzure` table function, which takes the storage account URL, container name, and blob path as separate arguments:

```sql
SELECT *
FROM deltaLakeAzure(
    'https://myaccount.blob.core.windows.net',
    'container',
    'delta-tables/events/',
    'ACCOUNT_NAME',
    'ACCOUNT_KEY'
)
LIMIT 100;
```

## Copying Delta Lake Data into ClickHouse

For better query performance, copy Delta Lake data into a native ClickHouse table:

```sql
CREATE TABLE events_local (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);

INSERT INTO events_local
SELECT event_time, event_type, user_id
FROM deltaLake('s3://my-bucket/delta-tables/events/', 'ACCESS_KEY', 'SECRET_KEY')
WHERE event_date >= '2025-01-01';
```

## Schema Inspection

View the schema of a Delta Lake table:

```sql
DESCRIBE TABLE deltaLake('s3://my-bucket/delta-tables/events/', 'ACCESS_KEY', 'SECRET_KEY');
```

## Summary

ClickHouse supports querying Delta Lake tables via the `deltaLake` table function and `DeltaLake` engine. Use these for federated queries across your data lake without copying data. For performance-critical workloads, import Delta Lake data into native MergeTree tables, which offer significantly faster query execution than reading from S3.
