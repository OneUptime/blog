# How to Replicate Data from PostgreSQL to ClickHouse in Real-Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, Replication, CDC, Debezium, Real-Time, MaterializedPostgreSQL

Description: Replicate PostgreSQL tables into ClickHouse in real-time using MaterializedPostgreSQL engine or Debezium CDC for live analytics.

---

ClickHouse offers two approaches to real-time PostgreSQL replication: the built-in `MaterializedPostgreSQL` engine and CDC via Debezium. Each has trade-offs for different use cases.

## Option 1: MaterializedPostgreSQL Engine

`MaterializedPostgreSQL` uses PostgreSQL's logical replication to stream changes to ClickHouse.

### Configure PostgreSQL

Enable logical replication:

```bash
# postgresql.conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
```

Create a replication user:

```sql
CREATE USER clickhouse_replicator WITH REPLICATION PASSWORD 'secret';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO clickhouse_replicator;
```

Create a publication:

```sql
CREATE PUBLICATION clickhouse_pub FOR ALL TABLES;
```

### Create MaterializedPostgreSQL Database

```sql
CREATE DATABASE pg_replica
ENGINE = MaterializedPostgreSQL('pg-host:5432', 'myapp', 'clickhouse_replicator', 'secret')
SETTINGS
    materialized_postgresql_schema = 'public',
    materialized_postgresql_allow_automatic_update = 1;
```

### Query Replicated Tables

```sql
SELECT *
FROM pg_replica.orders
FINAL
WHERE created_at >= now() - INTERVAL 1 DAY
ORDER BY created_at DESC
LIMIT 100;
```

## Option 2: Debezium CDC via Kafka

For more control and reliability, use Debezium as the CDC connector:

```json
{
  "name": "pg-orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "pg-host",
    "database.port": "5432",
    "database.user": "clickhouse_replicator",
    "database.password": "secret",
    "database.dbname": "myapp",
    "plugin.name": "pgoutput",
    "table.include.list": "public.orders,public.customers",
    "topic.prefix": "cdc"
  }
}
```

Then consume from Kafka in ClickHouse:

```sql
CREATE TABLE orders_cdc_queue (
    before String,
    after String,
    op String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'cdc.public.orders',
    kafka_format = 'JSONEachRow';
```

Create a materialized view to process CDC events:

```sql
CREATE TABLE orders (
    id UInt64,
    status LowCardinality(String),
    total_amount Decimal(18, 4),
    created_at DateTime,
    _deleted UInt8 DEFAULT 0,
    _version UInt64 DEFAULT toUnixTimestamp(now())
) ENGINE = ReplacingMergeTree(_version)
ORDER BY id;

CREATE MATERIALIZED VIEW orders_cdc_mv TO orders AS
SELECT
    toUInt64(JSONExtractInt(if(op = 'd', before, after), 'id')) AS id,
    JSONExtractString(if(op = 'd', before, after), 'status') AS status,
    toDecimal64(JSONExtractFloat(if(op = 'd', before, after), 'total_amount'), 4) AS total_amount,
    toDateTime(JSONExtractInt(if(op = 'd', before, after), 'created_at') / 1000) AS created_at,
    if(op = 'd', 1, 0) AS _deleted
FROM orders_cdc_queue
WHERE op IN ('c', 'u', 'd');
```

## Monitor Replication

For `MaterializedPostgreSQL`:

```sql
SELECT * FROM system.materialized_postgresql_tables;
```

For Debezium:

```bash
kafka-consumer-groups --bootstrap-server kafka:9092 \
  --group clickhouse-cdc --describe
```

## Summary

PostgreSQL to ClickHouse replication works via `MaterializedPostgreSQL` for a zero-configuration approach or Debezium CDC for production-grade pipelines with better observability. Use the `FINAL` keyword or `ReplacingMergeTree` to handle update and delete operations correctly in analytical queries.
