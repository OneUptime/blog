# How to Use Hive Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hive, Storage Engine, Hadoop, Data Lake

Description: Learn how to use the Hive table engine in ClickHouse to query Apache Hive tables directly, leveraging Hive Metastore for schema and partition discovery.

---

The `Hive` table engine allows ClickHouse to read data from Apache Hive tables stored on HDFS or S3. It connects to the Hive Metastore to discover table schema, partition layout, and file locations, then reads the underlying files directly in Parquet, ORC, or text format. This engine is useful when your organization has an existing Hive data lake and you want ClickHouse to provide fast analytical queries against that data without duplicating it.

## Prerequisites

The Hive engine requires:
1. Access to a Hive Metastore (Thrift API, typically port 9083).
2. ClickHouse connectivity to HDFS or S3 where the Hive table data resides.
3. ClickHouse compiled with Hive support (`ENABLE_HIVE=1`).

## Creating a Hive Engine Table

```sql
-- Syntax: Hive('thrift://metastore_host:port', 'hive_database', 'hive_table')
CREATE TABLE hive_orders
(
    order_id     UInt64,
    customer_id  UInt64,
    status       String,
    total_amount Float64,
    order_date   Date,
    country      String
)
ENGINE = Hive(
    'thrift://hive-metastore:9083',
    'ecommerce',
    'orders'
);
```

ClickHouse reads the actual file locations and partition structure from the Hive Metastore. The column definitions in `CREATE TABLE` must match the Hive table schema.

## Querying a Hive Table

```sql
SELECT
    order_date,
    country,
    status,
    count()           AS order_count,
    sum(total_amount) AS total_revenue
FROM hive_orders
WHERE order_date BETWEEN '2024-06-01' AND '2024-06-30'
GROUP BY order_date, country, status
ORDER BY order_date, total_revenue DESC;
```

```text
order_date  country  status    order_count  total_revenue
2024-06-01  US       shipped   1423         142856.77
2024-06-01  US       pending   88           8823.12
2024-06-01  DE       shipped   342          34198.44
```

## Partition Pruning

When a Hive table is partitioned (common for date-based partitions), ClickHouse pushes partition predicates to the Metastore to skip irrelevant partitions.

```sql
-- The Hive table is partitioned by year, month, day
-- ClickHouse resolves only the matching HDFS partitions via Metastore
SELECT
    count()           AS events,
    uniq(user_id)     AS unique_users
FROM hive_events
WHERE year = 2024 AND month = 6 AND day = 15;
```

```text
events   unique_users
1482334  89421
```

## Reading Parquet-Backed Hive Tables

Most production Hive tables use Parquet or ORC storage formats.

```sql
CREATE TABLE hive_page_views
(
    event_time  DateTime,
    user_id     UInt64,
    page        String,
    duration_ms UInt32,
    country     String
)
ENGINE = Hive(
    'thrift://hive-metastore:9083',
    'analytics',
    'page_views'       -- Hive table stored as Parquet on HDFS
);

-- Aggregation over Parquet-backed Hive table
SELECT
    page,
    count()               AS views,
    uniq(user_id)         AS unique_visitors,
    avg(duration_ms)      AS avg_duration_ms,
    quantile(0.95)(duration_ms) AS p95_duration_ms
FROM hive_page_views
WHERE toDate(event_time) = yesterday()
GROUP BY page
ORDER BY views DESC
LIMIT 20;
```

## Joining Hive Tables With Local ClickHouse Tables

```sql
-- Local ClickHouse dimension table
-- Hive fact table for the JOIN

SELECT
    h.country,
    u.plan,
    count()           AS orders,
    sum(h.total_amount) AS revenue
FROM hive_orders AS h
JOIN users AS u ON h.customer_id = u.user_id
WHERE h.order_date >= '2024-06-01'
  AND h.status = 'shipped'
GROUP BY h.country, u.plan
ORDER BY revenue DESC
LIMIT 10;
```

## Loading Hive Data Into MergeTree for Repeated Queries

```sql
CREATE TABLE orders_local
(
    order_id     UInt64,
    customer_id  UInt64,
    status       LowCardinality(String),
    total_amount Float64,
    order_date   Date,
    country      LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(order_date)
ORDER BY (order_date, customer_id);

-- Load a specific month from Hive into local MergeTree
INSERT INTO orders_local
SELECT
    order_id,
    customer_id,
    status,
    total_amount,
    order_date,
    country
FROM hive_orders
WHERE order_date BETWEEN '2024-06-01' AND '2024-06-30';
```

## Checking Partition Metadata From Metastore

ClickHouse exposes information about the Hive partitions it discovered.

```sql
-- List partitions resolved for a query
EXPLAIN
SELECT count()
FROM hive_orders
WHERE order_date = '2024-06-15';
```

```text
...
ReadFromHive (partitions resolved: 1 of 365)
...
```

## ORC-Backed Hive Table

```sql
CREATE TABLE hive_user_sessions
(
    session_id  String,
    user_id     UInt64,
    start_time  DateTime,
    end_time    DateTime,
    page_count  UInt32,
    bounce      UInt8
)
ENGINE = Hive(
    'thrift://hive-metastore:9083',
    'analytics',
    'user_sessions'   -- ORC-backed Hive table
);

SELECT
    toDate(start_time)  AS session_date,
    count()             AS sessions,
    sum(bounce)         AS bounces,
    round(sum(bounce) / count() * 100, 1) AS bounce_rate_pct,
    avg(page_count)     AS avg_pages_per_session
FROM hive_user_sessions
WHERE start_time >= '2024-06-01'
GROUP BY session_date
ORDER BY session_date;
```

## Error Handling: Schema Mismatch

If the ClickHouse schema does not match the Hive schema, queries will return errors. Always inspect the Hive schema first.

```bash
# Check Hive table schema before creating the ClickHouse engine table
hive -e "DESCRIBE FORMATTED ecommerce.orders;"
```

```sql
-- Then create the ClickHouse table with matching types
CREATE TABLE hive_orders
(
    order_id     UInt64,   -- matches BIGINT in Hive
    status       String,   -- matches STRING in Hive
    total_amount Float64,  -- matches DOUBLE in Hive
    order_date   Date      -- matches DATE in Hive
)
ENGINE = Hive('thrift://hive-metastore:9083', 'ecommerce', 'orders');
```

## Type Mapping Reference

```text
Hive Type      ClickHouse Type
TINYINT        Int8
SMALLINT       Int16
INT            Int32
BIGINT         Int64
FLOAT          Float32
DOUBLE         Float64
DECIMAL(P,S)   Decimal(P, S)
STRING/VARCHAR String
BOOLEAN        UInt8
DATE           Date
TIMESTAMP      DateTime
ARRAY<T>       Array(T)
MAP<K,V>       Map(K, V)
```

## Limitations

- Read-only: the Hive engine does not support INSERT or mutations.
- Requires Hive Metastore to be reachable from ClickHouse.
- Complex Hive types like `STRUCT` have limited support.
- Performance depends on HDFS/S3 throughput and the number of files.
- Kerberos-secured clusters require additional ClickHouse configuration.

## Summary

The `Hive` table engine makes ClickHouse a high-performance query layer for existing Hive data lakes. It discovers schema and partitions from the Hive Metastore and reads underlying Parquet or ORC files directly from HDFS or S3. Use partition filters to avoid full table scans, and copy frequently queried data into local MergeTree tables for best interactive query performance.
