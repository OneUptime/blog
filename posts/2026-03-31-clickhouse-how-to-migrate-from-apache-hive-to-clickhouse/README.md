# How to Migrate from Apache Hive to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Hive, Migration, Data Warehouse, Hadoop, ETL

Description: Migrate from Apache Hive to ClickHouse to replace slow MapReduce queries with fast vectorized execution and eliminate Hadoop cluster dependencies.

---

Apache Hive provides SQL-like queries over Hadoop's HDFS but is notorious for slow query times due to MapReduce execution. ClickHouse replaces this with vectorized in-memory execution that is typically 100x faster on the same data.

## Architecture Change

| Aspect | Hive | ClickHouse |
|--------|------|------------|
| Storage | HDFS | Local disk / S3 |
| Execution | MapReduce / Tez / Spark | Vectorized execution |
| Query latency | Minutes | Seconds / milliseconds |
| Dependencies | Hadoop, YARN, ZooKeeper | Single binary |

## Step 1 - Export Data from Hive

Export a Hive table to ORC or Parquet on HDFS, then move to S3:

```sql
-- In Hive
INSERT OVERWRITE DIRECTORY 's3a://bucket/hive-export/page_views'
STORED AS PARQUET
SELECT * FROM analytics.page_views;
```

Or use `hive` CLI to export to TSV:

```bash
hive -e "SELECT * FROM analytics.page_views" > /tmp/page_views.tsv
```

## Step 2 - Create the ClickHouse Table

Map Hive types to ClickHouse:

```sql
-- Hive DDL
-- CREATE TABLE page_views (
--     event_id    STRING,
--     user_id     STRING,
--     page        STRING,
--     duration    INT,
--     created_at  TIMESTAMP
-- )
-- PARTITIONED BY (dt STRING)
-- STORED AS ORC;

-- ClickHouse equivalent
CREATE TABLE analytics.page_views
(
    event_id    String,
    user_id     String,
    page        LowCardinality(String),
    duration    UInt32 DEFAULT 0,
    created_at  DateTime,
    dt          Date MATERIALIZED toDate(created_at)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(dt)
ORDER BY (dt, user_id, event_id);
```

## Step 3 - Load from S3

```sql
INSERT INTO analytics.page_views
SELECT
    event_id,
    user_id,
    page,
    duration,
    created_at
FROM s3(
    's3://bucket/hive-export/page_views/*.parquet',
    'KEY', 'SECRET',
    'Parquet'
);
```

## Step 4 - Translate HiveQL to ClickHouse SQL

```sql
-- Hive: lateral view explode
SELECT page, tag
FROM page_views
LATERAL VIEW explode(tags) t AS tag

-- ClickHouse
SELECT page, tag
FROM page_views
ARRAY JOIN tags AS tag
```

```sql
-- Hive: date functions
SELECT FROM_UNIXTIME(UNIX_TIMESTAMP(created_at), 'yyyy-MM-dd') AS day
FROM page_views

-- ClickHouse
SELECT toDate(created_at) AS day
FROM analytics.page_views
```

```sql
-- Hive: percentile
SELECT PERCENTILE(duration, 0.95) FROM page_views

-- ClickHouse
SELECT quantile(0.95)(duration) FROM analytics.page_views
```

## Step 5 - Replace Hive Partitions with ClickHouse Partitioning

Hive uses explicit partition columns. ClickHouse partitioning is automatic based on the partition expression:

```sql
-- Show existing partitions in ClickHouse
SELECT partition, rows, bytes_on_disk
FROM system.parts
WHERE table = 'page_views' AND database = 'analytics'
ORDER BY partition;
```

## Summary

Migrating from Hive to ClickHouse removes the Hadoop dependency and replaces slow MapReduce execution with millisecond-latency vectorized queries. HiveQL translates cleanly to ClickHouse SQL with minor function substitutions, and Parquet export from HDFS to S3 enables direct loading into ClickHouse.
