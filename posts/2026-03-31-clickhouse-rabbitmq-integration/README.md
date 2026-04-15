# How to Set Up RabbitMQ Integration with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RabbitMQ, AMQP, Streaming, Data Pipeline, Integration

Description: Integrate RabbitMQ with ClickHouse using the native RabbitMQ engine to consume AMQP messages directly into ClickHouse tables.

---

ClickHouse includes a native RabbitMQ engine that lets you consume messages from RabbitMQ queues and exchanges directly without an intermediate consumer application.

## Prerequisites

Enable the RabbitMQ engine in ClickHouse (enabled by default in most builds). Ensure your RabbitMQ server is accessible from the ClickHouse host.

## Create the Target Table

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32,
    payload String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

## Create the RabbitMQ Engine Table

```sql
CREATE TABLE events_rabbitmq_queue (
    event_time DateTime,
    event_type String,
    user_id UInt32,
    payload String
) ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port = 'rabbitmq-host:5672',
    rabbitmq_exchange_name = 'events_exchange',
    rabbitmq_routing_key_list = 'events.#',
    rabbitmq_exchange_type = 'topic',
    rabbitmq_format = 'JSONEachRow',
    rabbitmq_username = 'admin',
    rabbitmq_password = 'secret',
    rabbitmq_num_consumers = 4;
```

## Create Materialized View

Route messages from the RabbitMQ engine to the MergeTree table:

```sql
CREATE MATERIALIZED VIEW rabbitmq_to_events TO events AS
SELECT
    event_time,
    event_type,
    user_id,
    payload
FROM events_rabbitmq_queue;
```

## RabbitMQ Exchange Setup

Set up the exchange and binding in RabbitMQ:

```bash
# Declare exchange
rabbitmqadmin declare exchange name=events_exchange type=topic durable=true

# Declare queue
rabbitmqadmin declare queue name=clickhouse_events durable=true

# Bind queue to exchange
rabbitmqadmin declare binding source=events_exchange destination=clickhouse_events \
  routing_key="events.#"
```

## Configure Multiple Consumers

For higher throughput, increase consumer count:

```sql
ALTER TABLE events_rabbitmq_queue MODIFY SETTING rabbitmq_num_consumers = 8;
```

## Handle Message Acknowledgment

ClickHouse acknowledges messages only after they are successfully written to the MergeTree table. If the insert fails, messages are re-queued. Enable persistent delivery mode in your publisher:

```python
import json
import pika

connection = pika.BlockingConnection(pika.URLParameters('amqp://admin:secret@rabbitmq-host/'))
channel = connection.channel()
channel.basic_publish(
    exchange='events_exchange',
    routing_key='events.page_view',
    body=json.dumps(event),
    properties=pika.BasicProperties(delivery_mode=2)  # persistent
)
```

## Monitor Consumer Status

```sql
SELECT * FROM system.metrics WHERE metric LIKE '%RabbitMQ%';
```

## Summary

ClickHouse's native RabbitMQ engine provides a zero-code integration path for AMQP-based message pipelines. Configure the exchange, routing keys, and consumer count in the engine settings, then use a materialized view to write messages to a durable MergeTree table. Increase `rabbitmq_num_consumers` to scale throughput on high-volume queues.
