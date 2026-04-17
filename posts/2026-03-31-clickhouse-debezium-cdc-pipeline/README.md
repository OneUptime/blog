# How to Build a Change Data Capture Pipeline with Debezium and ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Debezium, Change Data Capture, CDC, Kafka, Real-Time Sync

Description: Build a real-time CDC pipeline from PostgreSQL to ClickHouse using Debezium and Kafka to keep your analytical store in sync within seconds.

---

## What Is Change Data Capture

Change Data Capture (CDC) reads the database transaction log and emits every insert, update, and delete as a stream of events. Debezium connects to PostgreSQL's Write-Ahead Log (WAL) and publishes changes to Kafka, which ClickHouse then consumes.

## Architecture

```text
PostgreSQL WAL --> Debezium Connector --> Kafka --> ClickHouse Kafka Engine --> MergeTree Table
```

## Configuring Debezium for PostgreSQL

Deploy the Debezium PostgreSQL connector via Kafka Connect:

```bash
curl -X POST http://kafka-connect:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "postgres-cdc",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "database.hostname": "pg.internal",
      "database.port": "5432",
      "database.user": "debezium",
      "database.password": "secret",
      "database.dbname": "production",
      "topic.prefix": "prod_pg",
      "table.include.list": "public.orders,public.users",
      "plugin.name": "pgoutput",
      "publication.name": "dbz_publication"
    }
  }'
```

Debezium publishes events to Kafka topics like `prod_pg.public.orders`.

## ClickHouse Kafka Source Table

```sql
CREATE TABLE orders_cdc_queue (
    raw String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'prod_pg.public.orders',
    kafka_group_name = 'ch_cdc_orders',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 2;
```

## Target Table with ReplacingMergeTree

Use `ReplacingMergeTree` to handle updates - each CDC event with the same primary key replaces the previous version:

```sql
CREATE TABLE orders (
    order_id     UInt64,
    user_id      UInt64,
    status       LowCardinality(String),
    total_cents  UInt64,
    created_at   DateTime,
    updated_at   DateTime,
    _deleted     UInt8 DEFAULT 0
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(created_at)
ORDER BY order_id;
```

## Materialized View to Transform CDC Events

Debezium wraps changes in a `before`/`after` envelope. Extract the relevant fields:

```sql
CREATE MATERIALIZED VIEW orders_cdc_mv TO orders AS
SELECT
    toUInt64(JSONExtractUInt(JSONExtractRaw(raw, 'after'), 'order_id')) AS order_id,
    toUInt64(JSONExtractUInt(JSONExtractRaw(raw, 'after'), 'user_id')) AS user_id,
    JSONExtractString(JSONExtractRaw(raw, 'after'), 'status') AS status,
    toUInt64(JSONExtractUInt(JSONExtractRaw(raw, 'after'), 'total_cents')) AS total_cents,
    fromUnixTimestamp(toInt64(JSONExtractUInt(JSONExtractRaw(raw, 'after'), 'created_at')) / 1000000) AS created_at,
    fromUnixTimestamp(toInt64(JSONExtractUInt(JSONExtractRaw(raw, 'after'), 'updated_at')) / 1000000) AS updated_at,
    if(JSONExtractString(raw, 'op') = 'd', 1, 0) AS _deleted
FROM orders_cdc_queue;
```

## Querying with Deduplication

Always use `FINAL` to get the latest version of each row, respecting deletes:

```sql
SELECT order_id, user_id, status, total_cents
FROM orders FINAL
WHERE _deleted = 0
  AND status = 'pending'
LIMIT 100;
```

## Summary

A Debezium and ClickHouse CDC pipeline delivers real-time replication from transactional databases to ClickHouse with seconds of lag, enabling fresh analytical queries without polling or batch jobs.
