# How to Use ClickHouse with Apache Hive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Hive, Data Lake, Analytics, Hadoop

Description: Learn how to query Apache Hive tables from ClickHouse using the Hive table engine, including Hive Metastore integration and reading ORC and Parquet files from HDFS.

---

> ClickHouse's Hive engine reads table metadata from the Hive Metastore and data files directly from HDFS, making your data warehouse accessible for fast analytics.

Apache Hive manages metadata for large datasets stored on HDFS and S3. ClickHouse can connect to the Hive Metastore to read table schemas and partition information, then read the underlying ORC or Parquet files directly for fast analytical queries. This guide covers the Hive engine configuration, querying Hive tables, and integrating ClickHouse into an existing Hive-based data warehouse.

---

## Prerequisites

Verify connectivity to Hive Metastore and HDFS.

```bash
# Check Hive Metastore is running
netstat -tlnp | grep 9083

# Test HDFS connectivity
hdfs dfs -ls /user/hive/warehouse

# Verify ClickHouse Hive support
clickhouse-client --query \
  "SELECT * FROM system.table_functions WHERE name = 'hive'"

# Check the Hive engine in system tables
clickhouse-client --query \
  "SELECT name FROM system.table_engines WHERE name = 'Hive'"
```

## Creating a Sample Hive Table

Create a Parquet-based Hive table to demonstrate ClickHouse integration.

```sql
-- Run in Hive CLI or Beeline
CREATE DATABASE IF NOT EXISTS analytics;

CREATE EXTERNAL TABLE analytics.user_events (
    event_id    STRING,
    user_id     BIGINT,
    event_type  STRING,
    page        STRING,
    revenue     DOUBLE,
    ts          TIMESTAMP
)
PARTITIONED BY (dt STRING, event_category STRING)
STORED AS PARQUET
TBLPROPERTIES (
    'parquet.compression' = 'SNAPPY',
    'transactional'       = 'false'
)
LOCATION 'hdfs:///user/hive/warehouse/analytics/user_events';

-- Insert sample data
INSERT INTO analytics.user_events
PARTITION (dt='2026-03-31', event_category='web')
SELECT
    concat('evt-', cast(id AS STRING)),
    id % 10000,
    CASE WHEN id % 3 = 0 THEN 'page_view'
         WHEN id % 3 = 1 THEN 'click'
         ELSE 'purchase' END,
    concat('/page-', cast(id % 100 AS STRING)),
    CASE WHEN id % 5 = 0 THEN cast(id % 500 AS DOUBLE) ELSE 0.0 END,
    current_timestamp()
FROM (SELECT explode(array(1,2,3,4,5,6,7,8,9,10)) AS id) t
LATERAL VIEW explode(array(1,2,3,4,5,6,7,8,9,10)) t2 AS id2;

-- Repair partitions
MSCK REPAIR TABLE analytics.user_events;
```

## Configuring ClickHouse to Connect to Hive

The Hive Metastore address is provided directly in the `CREATE TABLE` statement (see the next section). To speed up repeated reads of HDFS files, enable the local cache for remote filesystems in the ClickHouse server configuration.

```xml
<!-- /etc/clickhouse-server/config.d/hive.xml -->
<clickhouse>
    <local_cache_for_remote_fs>
        <enable>true</enable>
        <root_dir>local_cache</root_dir>
        <limit_size>559096952</limit_size>
        <bytes_read_before_flush>1048576</bytes_read_before_flush>
    </local_cache_for_remote_fs>
</clickhouse>
```

## Creating a Hive Table in ClickHouse

Register the Hive table in ClickHouse for direct querying.

```sql
-- Create a ClickHouse table backed by the Hive table.
-- Column names and types must match the Hive table schema.
CREATE TABLE hive_user_events
(
    `event_id`       String,
    `user_id`        Int64,
    `event_type`     String,
    `page`           String,
    `revenue`        Float64,
    `ts`             DateTime,
    `dt`             String,
    `event_category` String
)
ENGINE = Hive(
    'thrift://hive-metastore.example.com:9083',
    'analytics',
    'user_events'
)
PARTITION BY (dt, event_category);

-- Verify the schema
DESCRIBE TABLE hive_user_events;
```

## Querying Hive Tables

Run analytical queries that benefit from partition pruning.

```sql
-- Total events per type for a specific partition
SELECT
    event_type,
    count()      AS total,
    sum(revenue) AS revenue
FROM hive_user_events
WHERE dt = '2026-03-31'
  AND event_category = 'web'
GROUP BY event_type
ORDER BY total DESC;

-- Multi-partition query with date range
SELECT
    dt,
    event_type,
    count() AS events
FROM hive_user_events
WHERE dt BETWEEN '2026-03-01' AND '2026-03-31'
GROUP BY dt, event_type
ORDER BY dt, events DESC;

-- Revenue analysis
SELECT
    dt,
    sum(revenue)         AS total_revenue,
    count()              AS purchase_count,
    avg(revenue)         AS avg_order_value,
    count(DISTINCT user_id) AS unique_buyers
FROM hive_user_events
WHERE event_type = 'purchase'
  AND dt >= '2026-03-01'
GROUP BY dt
ORDER BY dt;
```

## Reading ORC Files Directly

If the Hive engine is not available, use the HDFS table function with ORC format.

```sql
-- Read ORC files directly from HDFS
SELECT
    event_type,
    count() AS total
FROM hdfs(
    'hdfs://namenode:8020/user/hive/warehouse/analytics/user_events/dt=2026-03-31/*/*.orc',
    'ORC'
)
GROUP BY event_type;

-- Read Parquet files from HDFS
SELECT count()
FROM hdfs(
    'hdfs://namenode:8020/user/hive/warehouse/analytics/user_events/dt=2026-03-31/event_category=web/*.parquet',
    'Parquet'
);
```

## Reading Hive Data from S3

When Hive stores data on S3 (common with EMR), use the S3 table function.

```sql
-- Hive table backed by S3 Parquet files
SELECT
    event_type,
    count()      AS total,
    sum(revenue) AS revenue
FROM s3(
    's3://my-data-lake/hive/analytics/user_events/dt=2026-03-31/event_category=web/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
GROUP BY event_type;

-- Create a persistent S3-backed table for a Hive partition
CREATE TABLE hive_user_events_s3
(
    event_id    String,
    user_id     UInt64,
    event_type  String,
    page        String,
    revenue     Float64,
    ts          DateTime
)
ENGINE = S3(
    's3://my-data-lake/hive/analytics/user_events/dt=2026-03-*/event_category=web/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

## Syncing Hive Data into ClickHouse

For faster repeated queries, materialize Hive data into native ClickHouse tables.

```sql
-- Create a native ClickHouse table
CREATE TABLE clickhouse_user_events
(
    event_id    String,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    revenue     Float64,
    ts          DateTime,
    dt          String,
    event_category LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts);

-- Copy from Hive into ClickHouse (run daily via cron or workflow)
INSERT INTO clickhouse_user_events
SELECT
    event_id,
    user_id,
    event_type,
    page,
    revenue,
    ts,
    dt,
    event_category
FROM hive_user_events
WHERE dt = toString(yesterday());
```

## Scheduling Daily Syncs

Automate the Hive-to-ClickHouse sync.

```bash
#!/bin/bash
# /opt/scripts/hive_to_clickhouse.sh

YESTERDAY=$(date -d 'yesterday' '+%Y-%m-%d')

clickhouse-client \
  --host localhost \
  --user default \
  --password password \
  --query "
    INSERT INTO clickhouse_user_events
    SELECT event_id, user_id, event_type, page, revenue, ts, dt, event_category
    FROM hive_user_events
    WHERE dt = '${YESTERDAY}'
  "

echo "Synced Hive data for ${YESTERDAY}"
```

```bash
# Add to crontab
# 0 2 * * * /opt/scripts/hive_to_clickhouse.sh >> /var/log/hive_sync.log 2>&1
```

## Summary

ClickHouse integrates with Apache Hive through the Hive engine, which reads partition metadata from the Hive Metastore and data files directly from HDFS. Configure the Metastore connection in `config.d/hive.xml`, register Hive tables with `ENGINE = Hive(...)`, and use partition predicates to minimize file scans. For Hive tables on S3 or when the Hive engine is unavailable, use the `hdfs()` or `s3()` table functions to read ORC and Parquet files directly. For best query performance, sync frequently queried partitions into native MergeTree tables.
