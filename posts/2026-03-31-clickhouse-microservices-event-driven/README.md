# How to Use ClickHouse in a Microservices Event-Driven Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Microservice, Event-Driven Architecture, Kafka, Analytics

Description: Use ClickHouse as the analytical backbone of a microservices event-driven architecture by subscribing to domain events and powering cross-service analytics.

---

## ClickHouse and Event-Driven Systems

In a microservices architecture, services communicate via events on a message bus like Kafka. ClickHouse can subscribe to these event streams and provide a unified analytical view across all services - something individual service databases cannot offer.

## Architecture Overview

```text
Order Service  ---> Kafka (orders topic) --->
Payment Service --> Kafka (payments topic) --> ClickHouse --> Analytics API
User Service   ---> Kafka (users topic)  --->
```

Each service publishes domain events. ClickHouse consumes all topics and joins them for cross-domain analytics.

## Creating Topic-Specific Tables

Create one table per domain event type:

```sql
CREATE TABLE order_events (
    event_time     DateTime,
    order_id       UUID,
    user_id        UInt64,
    status         LowCardinality(String),
    amount_cents   UInt64,
    currency       LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);

CREATE TABLE payment_events (
    event_time     DateTime,
    payment_id     UUID,
    order_id       UUID,
    status         LowCardinality(String),
    processor      LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (order_id, event_time);
```

## Wiring Kafka to ClickHouse

```sql
CREATE TABLE order_events_kafka (
    event_time     DateTime,
    order_id       UUID,
    user_id        UInt64,
    status         LowCardinality(String),
    amount_cents   UInt64,
    currency       LowCardinality(String)
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'orders',
    kafka_group_name = 'ch_orders',
    kafka_format = 'JSONEachRow';

CREATE MATERIALIZED VIEW order_events_mv TO order_events AS
SELECT event_time, order_id, user_id, status, amount_cents, currency
FROM order_events_kafka;
```

Repeat for each domain topic.

## Cross-Service Analytics

Once all events land in ClickHouse, join across domains - something impossible without a unified store:

```sql
SELECT
    o.user_id,
    count(DISTINCT o.order_id) AS orders,
    countIf(p.status = 'failed') AS failed_payments,
    sum(o.amount_cents) / 100.0 AS total_spent
FROM order_events o
LEFT JOIN payment_events p ON p.order_id = o.order_id
WHERE o.event_time >= now() - INTERVAL 7 DAY
GROUP BY o.user_id
HAVING failed_payments > 0
ORDER BY failed_payments DESC
LIMIT 50;
```

## Handling Event Schema Evolution

Use `JSONAsString` format with `JSONExtract` functions to handle schema changes gracefully. Define the Kafka table with a single `String` column so the raw JSON is preserved:

```sql
CREATE TABLE order_events_kafka_raw (
    raw String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'orders',
    kafka_group_name = 'ch_orders',
    kafka_format = 'JSONAsString';

CREATE MATERIALIZED VIEW order_events_mv TO order_events AS
SELECT
    toDateTime(JSONExtractString(raw, 'event_time')) AS event_time,
    toUUID(JSONExtractString(raw, 'order_id')) AS order_id,
    JSONExtractUInt(raw, 'user_id') AS user_id,
    JSONExtractString(raw, 'status') AS status,
    JSONExtractUInt(raw, 'amount_cents') AS amount_cents,
    JSONExtractString(raw, 'currency') AS currency
FROM order_events_kafka_raw;
```

## Monitoring the Event Pipeline

Track consumer lag per topic to detect processing delays:

```sql
SELECT
    database,
    table,
    consumer_id,
    assignments.topic,
    assignments.partition_id,
    assignments.current_offset
FROM system.kafka_consumers
ORDER BY database, table;
```

Alert via OneUptime when consumer lag grows beyond an acceptable threshold.

## Summary

ClickHouse as the analytical sink in an event-driven microservices architecture provides a unified cross-service query layer by subscribing to all Kafka topics and enabling joins that span domain boundaries.
