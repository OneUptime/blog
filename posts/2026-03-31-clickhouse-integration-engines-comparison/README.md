# ClickHouse Integration Engines Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Integration Engine, Kafka, S3, MySQL, PostgreSQL, External Table

Description: A comparison of ClickHouse integration table engines - Kafka, S3, MySQL, PostgreSQL, JDBC, MongoDB, and Redis - covering read/write support and configuration.

---

## What Are Integration Engines

ClickHouse integration engines let you query external systems directly using SQL, without copying data into ClickHouse. They enable real-time ingestion (Kafka), external data queries (MySQL, PostgreSQL), and object storage access (S3, HDFS).

## Integration Engines Overview

```text
Engine      | Read | Write | Streaming | Notes
------------|------|-------|-----------|---------------------------------------
Kafka       | Yes  | Yes   | Yes       | Consume/produce Kafka topics
S3          | Yes  | Yes   | No        | Query S3/GCS files directly
MySQL       | Yes  | Yes   | No        | Direct MySQL query proxy
PostgreSQL  | Yes  | Yes   | No        | Direct PostgreSQL query proxy
JDBC        | Yes  | Yes   | No        | Any JDBC-compatible database
MongoDB     | Yes  | No    | No        | Read-only MongoDB collections
Redis       | Yes  | Yes   | No        | Read/write Redis keys
HDFS        | Yes  | Yes   | No        | Read/write HDFS files
URL         | Yes  | Yes   | No        | HTTP endpoints
```

## Kafka Engine - Real-Time Ingestion

```sql
CREATE TABLE events_kafka (
  event_id   UInt64,
  user_id    UInt32,
  event_type String,
  event_time DateTime
) ENGINE = Kafka
SETTINGS
  kafka_broker_list  = 'kafka:9092',
  kafka_topic_list   = 'user_events',
  kafka_group_name   = 'clickhouse_consumer',
  kafka_format       = 'JSONEachRow';

-- Materialized view moves data into MergeTree
CREATE MATERIALIZED VIEW events_mv TO events AS
SELECT * FROM events_kafka;
```

## S3 Engine - Query Object Storage

```sql
-- Query S3 files directly without importing
SELECT count(), sum(amount)
FROM s3(
  'https://s3.amazonaws.com/mybucket/events/2026/03/31/*.parquet',
  'ACCESS_KEY', 'SECRET_KEY',
  'Parquet'
);

-- Create persistent S3 table
CREATE TABLE s3_events (
  event_id UInt64,
  amount   Float64
) ENGINE = S3('https://s3.amazonaws.com/mybucket/events/*.csv', 'CSV');
```

## MySQL Engine - Query MySQL Directly

```sql
CREATE TABLE mysql_orders (
  order_id   UInt32,
  customer_id UInt32,
  total      Float64,
  created_at DateTime
) ENGINE = MySQL('mysql-host:3306', 'ecommerce', 'orders', 'user', 'password');

-- Join ClickHouse events with MySQL orders
SELECT e.user_id, count(e.event_id) AS events, sum(o.total) AS revenue
FROM events AS e
JOIN mysql_orders AS o ON e.user_id = o.customer_id
WHERE e.event_time >= today()
GROUP BY e.user_id;
```

## PostgreSQL Engine

```sql
CREATE TABLE pg_users (
  user_id  UInt64,
  email    String,
  country  String
) ENGINE = PostgreSQL('pg-host:5432', 'users_db', 'users', 'pg_user', 'pg_pass');
```

## MongoDB Engine

```sql
CREATE TABLE mongo_products (
  product_id String,
  name       String,
  price      Float64
) ENGINE = MongoDB('mongo-host:27017', 'catalog', 'products', 'user', 'pass');
```

## Choosing an Integration Engine

```text
Use case                            | Best Engine
------------------------------------|------------------
Stream events from Kafka            | Kafka
Query historical S3/GCS data        | S3
Enrich ClickHouse data with MySQL   | MySQL
Sync users from PostgreSQL          | PostgreSQL
Access MongoDB product catalog      | MongoDB
Read any JDBC-compatible database   | JDBC
```

## Summary

ClickHouse integration engines let you query external systems directly using SQL or use them as ingestion sources. Use the Kafka engine for real-time streaming with a materialized view to move data into MergeTree tables. Use S3 for querying historical data lakes without importing. MySQL and PostgreSQL engines are useful for enriching analytics queries with data from OLTP systems.
