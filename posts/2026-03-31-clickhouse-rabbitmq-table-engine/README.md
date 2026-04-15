# How to Use RabbitMQ Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RabbitMQ, Table Engine, Streaming, Message Queue, Integration, SQL

Description: Learn how to use the ClickHouse RabbitMQ table engine to consume messages from RabbitMQ queues directly into ClickHouse tables using materialized views.

---

The RabbitMQ table engine in ClickHouse acts as a consumer of a RabbitMQ exchange or queue. Messages consumed from RabbitMQ are exposed as rows in the table. Combined with a Materialized View, it forms a continuous streaming pipeline that persists RabbitMQ data into a MergeTree table.

## Creating a RabbitMQ Table

```sql
CREATE TABLE events_queue (
    ts         DateTime,
    event_type String,
    user_id    UInt64,
    value      Float64
) ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port     = 'rabbitmq-host:5672',
    rabbitmq_exchange_name = 'events',
    rabbitmq_format        = 'JSONEachRow',
    rabbitmq_num_consumers = 4,
    rabbitmq_queue_base    = 'ch_events';
```

## RabbitMQ Engine Settings

```text
Setting                    Description
rabbitmq_host_port         RabbitMQ host and AMQP port
rabbitmq_exchange_name     Exchange to consume from
rabbitmq_exchange_type     Exchange type: direct, fanout, topic, headers (default: fanout)
rabbitmq_routing_key_list  Comma-separated routing keys for direct/topic exchanges
rabbitmq_format            Message format (JSONEachRow, CSV, Avro, etc.)
rabbitmq_num_consumers     Number of consumer threads
rabbitmq_queue_base        Base name for the consumer queue(s)
rabbitmq_vhost             RabbitMQ virtual host (default: /)
rabbitmq_username          Username for authentication
rabbitmq_password          Password for authentication
```

## Setting Up the Materialized View Pipeline

SELECT queries on a RabbitMQ table read each message only once, making them unsuitable for production use. Create a Materialized View to continuously consume and persist data into a MergeTree table:

```sql
-- Target MergeTree table
CREATE TABLE events (
    ts         DateTime,
    event_type LowCardinality(String),
    user_id    UInt64,
    value      Float64
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);

-- Materialized View: connects RabbitMQ source to MergeTree sink
CREATE MATERIALIZED VIEW events_mv TO events AS
SELECT ts, event_type, user_id, value
FROM events_queue;
```

Once the MV exists, ClickHouse starts consuming messages and inserting them into `events`.

## Authentication

```sql
CREATE TABLE events_queue (...)
ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port  = 'rabbitmq-host:5672',
    rabbitmq_exchange_name = 'events',
    rabbitmq_format     = 'JSONEachRow',
    rabbitmq_username   = 'ch_consumer',
    rabbitmq_password   = 'secure_password',
    rabbitmq_vhost      = '/production';
```

## Topic Exchange with Routing Keys

```sql
CREATE TABLE order_events_queue (
    order_id   UInt64,
    status     String,
    updated_at DateTime
) ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port         = 'rabbitmq-host:5672',
    rabbitmq_exchange_name     = 'order_events',
    rabbitmq_exchange_type     = 'topic',
    rabbitmq_routing_key_list  = 'orders.created,orders.updated,orders.cancelled',
    rabbitmq_format            = 'JSONEachRow',
    rabbitmq_num_consumers     = 2;
```

## Monitoring Consumption

```sql
-- Check incoming rows through the materialized view
SELECT count(), max(ts)
FROM events
WHERE ts >= now() - INTERVAL 1 MINUTE;
```

```sql
-- Check current message backlog (via RabbitMQ management API, not ClickHouse SQL)
-- curl http://rabbitmq-host:15672/api/queues/%2F/ch_events
```

## Fault Tolerance

The RabbitMQ engine uses manual acknowledgment - messages are ACKed only after successful insert into ClickHouse. If ClickHouse restarts, unconsumed messages remain in the queue.

## Summary

The RabbitMQ table engine consumes messages from a RabbitMQ exchange and exposes them as a ClickHouse table source. Pair it with a Materialized View targeting a MergeTree table to create a persistent streaming pipeline. Use `rabbitmq_num_consumers` to increase throughput and configure `rabbitmq_exchange_type` and `rabbitmq_routing_key_list` for topic-based routing.
