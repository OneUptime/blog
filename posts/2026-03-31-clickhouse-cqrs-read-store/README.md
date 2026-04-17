# How to Implement CQRS with ClickHouse as the Read Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CQRS, Architecture, Read Model, Analytics

Description: Learn how to use ClickHouse as the read-side store in a CQRS architecture, syncing from a primary write store for high-performance analytics queries.

---

## CQRS Overview

Command Query Responsibility Segregation (CQRS) separates write operations from read operations. The write side handles commands and enforces business rules, while the read side is optimized purely for queries. ClickHouse is an ideal read store because it handles analytical queries at scale with sub-second latency.

## Architecture

```text
[Commands] --> [Write DB (PostgreSQL)] --> [Change Stream] --> [ClickHouse Read Store]
[Queries]  <---------------------------------------------------[ClickHouse Read Store]
```

Events or change data capture (CDC) records flow from PostgreSQL into ClickHouse via Kafka or direct replication.

## Read Model Table

Design the read model for query patterns, not for normalization:

```sql
CREATE TABLE order_read_model
(
    order_id        UUID,
    customer_id     UInt64,
    customer_name   String,
    status          LowCardinality(String),
    total_amount    Decimal(18, 2),
    item_count      UInt16,
    created_at      DateTime,
    updated_at      DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(created_at)
ORDER BY (customer_id, order_id);
```

The denormalized schema avoids joins at query time.

## Syncing from PostgreSQL via Kafka

Use Debezium to stream PostgreSQL changes into Kafka, then consume them in ClickHouse:

```sql
CREATE TABLE orders_kafka_queue
(
    payload String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'pg.public.orders',
    kafka_group_name = 'clickhouse-cqrs',
    kafka_format = 'JSONEachRow';
```

A materialized view transforms and routes the payload into `order_read_model`.

## Handling Upserts

Since commands update the write store, ClickHouse needs to handle updates via `ReplacingMergeTree`. Query with `FINAL` to get the latest version:

```sql
SELECT order_id, status, total_amount
FROM order_read_model FINAL
WHERE customer_id = 12345
ORDER BY created_at DESC
LIMIT 20;
```

## Aggregated Read Models

For dashboard queries, maintain pre-aggregated projections:

```sql
CREATE MATERIALIZED VIEW daily_revenue_mv
ENGINE = SummingMergeTree()
ORDER BY (day, status)
AS
SELECT
    toDate(created_at) AS day,
    status,
    sum(total_amount) AS revenue,
    count() AS orders
FROM order_read_model
GROUP BY day, status;
```

## Query Example

A typical CQRS read query that would be expensive in a transactional database:

```sql
SELECT
    customer_id,
    count() AS total_orders,
    sum(total_amount) AS lifetime_value,
    max(created_at) AS last_order
FROM order_read_model FINAL
WHERE status = 'completed'
GROUP BY customer_id
HAVING total_orders > 5
ORDER BY lifetime_value DESC
LIMIT 100;
```

## Summary

Using ClickHouse as the read store in CQRS decouples your analytical query load from the transactional write database. Sync changes via Kafka CDC, use `ReplacingMergeTree` for upsert semantics, and maintain materialized views for common aggregations. This architecture lets you scale reads and writes independently.
