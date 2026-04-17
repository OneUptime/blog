# How to Query Apache Iceberg Tables from ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Iceberg, Data Lake, Analytics, S3

Description: Learn how to query Apache Iceberg tables directly from ClickHouse using the Iceberg table function and engine, including schema evolution and time travel queries.

---

> ClickHouse's native Iceberg support lets you query open table format data stored on S3, GCS, or HDFS without copying data.

Apache Iceberg is the leading open table format for large analytic datasets. ClickHouse 23.4+ includes native support for reading Iceberg tables stored on object storage, enabling you to query your data lake directly alongside your operational ClickHouse tables. This guide covers setting up the integration, querying Iceberg tables, and using Iceberg-specific features like time travel.

---

## Prerequisites

Verify your ClickHouse version supports Iceberg.

```bash
# Check ClickHouse version (23.4+ required for Iceberg support)
clickhouse-client --query "SELECT version()"

# Verify Iceberg is available
clickhouse-client --query \
  "SELECT * FROM system.table_functions WHERE name = 'iceberg'"
```

## Creating an Iceberg Table with Apache Spark

First, create a sample Iceberg table using Spark.

```python
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, LongType, TimestampType, DoubleType

spark = SparkSession.builder \
    .appName("CreateIceberg") \
    .config("spark.jars.packages",
            "org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.4.3,"
            "org.apache.hadoop:hadoop-aws:3.3.4") \
    .config("spark.sql.catalog.my_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.my_catalog.type", "hadoop") \
    .config("spark.sql.catalog.my_catalog.warehouse", "s3a://my-bucket/warehouse") \
    .config("spark.hadoop.fs.s3a.access.key", "ACCESS_KEY") \
    .config("spark.hadoop.fs.s3a.secret.key", "SECRET_KEY") \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .getOrCreate()

# Create Iceberg table
spark.sql("""
    CREATE TABLE IF NOT EXISTS my_catalog.analytics.user_events (
        event_id    STRING,
        user_id     BIGINT,
        event_type  STRING,
        page        STRING,
        revenue     DOUBLE,
        ts          TIMESTAMP
    )
    USING iceberg
    PARTITIONED BY (months(ts), event_type)
    TBLPROPERTIES (
        'write.format.default' = 'parquet',
        'write.parquet.compression-codec' = 'zstd'
    )
""")

# Insert sample data
from datetime import datetime, timedelta
import random

data = [
    (f"evt-{i}", random.randint(1, 10000),
     random.choice(['page_view', 'click', 'purchase']),
     f"/page-{random.randint(1, 100)}",
     round(random.uniform(0, 500), 2) if random.random() > 0.8 else 0.0,
     datetime(2026, 3, random.randint(1, 31), random.randint(0, 23)))
    for i in range(100000)
]

schema = StructType([
    StructField("event_id",   StringType(),    False),
    StructField("user_id",    LongType(),      False),
    StructField("event_type", StringType(),    False),
    StructField("page",       StringType(),    True),
    StructField("revenue",    DoubleType(),    True),
    StructField("ts",         TimestampType(), False)
])

df = spark.createDataFrame(data, schema)
df.writeTo("my_catalog.analytics.user_events").append()
print("Iceberg table created and populated")
```

## Querying Iceberg with the Table Function

Use the `iceberg` table function for ad-hoc queries without a persistent table.

```sql
-- Query the Iceberg table directly (catalog-based path)
SELECT
    event_type,
    count()             AS total_events,
    sum(revenue)        AS total_revenue,
    count(DISTINCT user_id) AS unique_users
FROM iceberg(
    's3://my-bucket/warehouse/analytics/user_events',
    'ACCESS_KEY',
    'SECRET_KEY'
)
GROUP BY event_type
ORDER BY total_events DESC;

-- Preview the schema
DESCRIBE iceberg(
    's3://my-bucket/warehouse/analytics/user_events',
    'ACCESS_KEY',
    'SECRET_KEY'
);
```

## Creating a Persistent Iceberg Table in ClickHouse

Register the Iceberg table as a persistent ClickHouse table.

```sql
-- Create a persistent Iceberg table (read-only)
CREATE TABLE user_events_iceberg
ENGINE = Iceberg(
    's3://my-bucket/warehouse/analytics/user_events',
    'ACCESS_KEY',
    'SECRET_KEY'
);

-- Describe the table to see the inferred schema
DESCRIBE TABLE user_events_iceberg;

-- Simple query
SELECT count() FROM user_events_iceberg;
```

## Querying with Partition Pruning

ClickHouse respects Iceberg partition metadata for efficient scans.

```sql
-- This query benefits from partition pruning on months(ts)
SELECT
    toDate(ts)  AS event_date,
    event_type,
    count()     AS events,
    sum(revenue) AS revenue
FROM user_events_iceberg
WHERE ts >= '2026-03-01' AND ts < '2026-04-01'
  AND event_type = 'purchase'
GROUP BY event_date, event_type
ORDER BY event_date;

-- Check how many files were read (explain the query)
EXPLAIN indexes = 1
SELECT count() FROM user_events_iceberg
WHERE ts >= '2026-03-15';
```

## Time Travel Queries

Query historical snapshots of the Iceberg table.

```sql
-- Query a specific snapshot ID
SELECT count() FROM iceberg(
    's3://my-bucket/warehouse/analytics/user_events',
    'ACCESS_KEY',
    'SECRET_KEY'
)
SETTINGS iceberg_snapshot_id = 4988871394938040894;

-- Query using a timestamp (data as of a specific time)
SELECT
    event_type,
    count() AS total
FROM iceberg(
    's3://my-bucket/warehouse/analytics/user_events',
    'ACCESS_KEY',
    'SECRET_KEY'
)
SETTINGS iceberg_timestamp_ms = 1774828800000  -- 2026-03-30 00:00:00 UTC
GROUP BY event_type;
```

## Schema Evolution

Iceberg handles schema changes transparently in ClickHouse.

```python
# Add a new column using Spark
spark.sql("""
    ALTER TABLE my_catalog.analytics.user_events
    ADD COLUMN browser STRING AFTER page
""")

# Insert records with the new column
spark.sql("""
    INSERT INTO my_catalog.analytics.user_events
    VALUES ('evt-new', 99999, 'page_view', '/new', 'Chrome', 0.0, current_timestamp())
""")
```

```sql
-- ClickHouse automatically sees the new column
SELECT event_id, page, browser, ts
FROM user_events_iceberg
WHERE browser IS NOT NULL
LIMIT 10;
```

## Joining Iceberg with ClickHouse Tables

Combine data lake tables with operational ClickHouse tables.

```sql
-- Enrich Iceberg events with ClickHouse user profile data
SELECT
    ie.event_type,
    up.country,
    count()      AS events,
    sum(ie.revenue) AS revenue
FROM user_events_iceberg ie
LEFT JOIN user_profiles up ON ie.user_id = up.user_id
WHERE ie.ts >= '2026-03-01'
GROUP BY ie.event_type, up.country
ORDER BY revenue DESC
LIMIT 20;
```

## Using GCS or MinIO

The same Iceberg engine works with other object stores.

```sql
-- Query Iceberg on GCS via the S3-compatible endpoint (HMAC credentials required)
CREATE TABLE user_events_gcs
ENGINE = Iceberg(
    'https://storage.googleapis.com/my-bucket/warehouse/analytics/user_events',
    'GCS_HMAC_ACCESS_ID',
    'GCS_HMAC_SECRET'
);

-- Query Iceberg on MinIO (self-hosted S3-compatible)
CREATE TABLE user_events_minio
ENGINE = Iceberg(
    'http://minio:9000/my-bucket/warehouse/analytics/user_events',
    'minioadmin',
    'minioadmin'
);
```

## Summary

ClickHouse's native Iceberg support enables direct querying of data lake tables stored on S3, GCS, or other object stores. Use the `iceberg()` table function for ad-hoc exploration and the `Iceberg` engine for persistent table registration. Partition pruning automatically reduces scan cost, time travel lets you query historical snapshots with `iceberg_snapshot_id` or `iceberg_timestamp_ms` settings, and schema evolution is handled transparently. Iceberg tables can be joined with regular ClickHouse tables to enrich data lake data with operational metadata.
