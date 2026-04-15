# How to Connect ClickHouse to RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RabbitMQ, Messaging, Data Engineering, Analytics

Description: Learn how to consume messages from RabbitMQ queues directly into ClickHouse using the RabbitMQ table engine, materialized views, and routing key filtering.

---

> ClickHouse's native RabbitMQ engine lets you consume AMQP messages and persist them into analytical tables without any intermediary service.

RabbitMQ is widely used for task queues and event routing. ClickHouse ships with a built-in RabbitMQ table engine that connects directly to an AMQP broker, consumes messages from queues, and feeds them into MergeTree tables through a materialized view. This guide covers the full setup including exchanges, queue bindings, and production tuning.

---

## Prerequisites

Make sure RabbitMQ is running and the management plugin is enabled.

```bash
# Enable the management plugin
rabbitmq-plugins enable rabbitmq_management

# Verify the broker is accessible
curl -s -u guest:guest http://localhost:15672/api/overview | python3 -m json.tool

# Check ClickHouse RabbitMQ support
clickhouse-client --query "SELECT * FROM system.build_options WHERE name = 'USE_AMQPCPP'"
```

## Setting Up RabbitMQ Exchange and Queue

Create the exchange and queue before configuring ClickHouse.

```bash
# Create a direct exchange
curl -s -u guest:guest \
  -H "Content-Type: application/json" \
  -X PUT http://localhost:15672/api/exchanges/%2F/analytics_exchange \
  -d '{"type":"direct","durable":true}'

# Create a durable queue
curl -s -u guest:guest \
  -H "Content-Type: application/json" \
  -X PUT http://localhost:15672/api/queues/%2F/clickhouse_events \
  -d '{"durable":true,"arguments":{"x-queue-type":"classic"}}'

# Bind the queue to the exchange with a routing key
curl -s -u guest:guest \
  -H "Content-Type: application/json" \
  -X POST http://localhost:15672/api/bindings/%2F/e/analytics_exchange/q/clickhouse_events \
  -d '{"routing_key":"user_events"}'
```

## Creating the Storage Table

Create the MergeTree table that will hold the consumed messages.

```sql
CREATE TABLE rmq_events
(
    event_id    UUID,
    user_id     UInt64,
    event_type  LowCardinality(String),
    payload     String,
    routing_key String,
    ts          DateTime64(3),
    received_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts)
TTL received_at + INTERVAL 60 DAY;
```

## Creating the RabbitMQ Table Engine

The RabbitMQ engine acts as an AMQP consumer inside ClickHouse.

```sql
CREATE TABLE rabbitmq_source
(
    event_id    String,
    user_id     UInt64,
    event_type  String,
    payload     String,
    ts          String
)
ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port         = 'localhost:5672',
    rabbitmq_exchange_name     = 'analytics_exchange',
    rabbitmq_routing_key_list  = 'user_events',
    rabbitmq_exchange_type     = 'direct',
    rabbitmq_format            = 'JSONEachRow',
    rabbitmq_num_consumers     = 4,
    rabbitmq_num_queues        = 2,
    rabbitmq_queue_base        = 'clickhouse_events',
    rabbitmq_persistent        = 1;
```

## Creating the Materialized View

Wire the RabbitMQ source to the storage table with transformations.

```sql
CREATE MATERIALIZED VIEW mv_rabbitmq_events TO rmq_events AS
SELECT
    toUUID(event_id)            AS event_id,
    user_id,
    event_type,
    payload,
    'user_events'               AS routing_key,
    parseDateTime64BestEffort(ts, 3) AS ts
FROM rabbitmq_source;
```

## Publishing Test Messages

Send sample messages from Python to verify the pipeline.

```python
import pika
import json
import uuid
import random
import time

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost')
)
channel = connection.channel()

event_types = ['page_view', 'click', 'purchase', 'signup']

for _ in range(500):
    message = {
        'event_id':   str(uuid.uuid4()),
        'user_id':    random.randint(1, 10000),
        'event_type': random.choice(event_types),
        'payload':    json.dumps({'source': 'web', 'version': '1.0'}),
        'ts':         time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    }

    channel.basic_publish(
        exchange='analytics_exchange',
        routing_key='user_events',
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=pika.DeliveryMode.Persistent
        )
    )

connection.close()
print('Published 500 messages')
```

## Using Topic Exchange for Routing

Route different event categories to separate ClickHouse tables.

```bash
# Create a topic exchange
curl -s -u guest:guest \
  -H "Content-Type: application/json" \
  -X PUT http://localhost:15672/api/exchanges/%2F/events_topic \
  -d '{"type":"topic","durable":true}'

# Bind with wildcard routing keys
curl -s -u guest:guest \
  -H "Content-Type: application/json" \
  -X POST http://localhost:15672/api/bindings/%2F/e/events_topic/q/clickhouse_web_events \
  -d '{"routing_key":"web.*"}'

curl -s -u guest:guest \
  -H "Content-Type: application/json" \
  -X POST http://localhost:15672/api/bindings/%2F/e/events_topic/q/clickhouse_app_events \
  -d '{"routing_key":"app.*"}'
```

```sql
-- ClickHouse table for web events
CREATE TABLE rabbitmq_web_source
(
    event_id   String,
    user_id    UInt64,
    event_type String,
    ts         String
)
ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port        = 'localhost:5672',
    rabbitmq_exchange_name    = 'events_topic',
    rabbitmq_routing_key_list = 'web.*',
    rabbitmq_exchange_type    = 'topic',
    rabbitmq_format           = 'JSONEachRow',
    rabbitmq_num_consumers    = 2;
```

## Handling Connection Failures

Configure reconnection and monitoring.

```sql
-- Check RabbitMQ consumer status
SELECT
    database,
    table,
    num_consumers,
    num_queues
FROM system.rabbitmq_consumers
WHERE database = 'default';

-- Restart a stalled consumer by detaching and reattaching
DETACH TABLE rabbitmq_source;
ATTACH TABLE rabbitmq_source;
```

## Querying the Ingested Data

Run analytics on the consumed messages.

```sql
-- Events per type in the last hour
SELECT
    event_type,
    count()              AS total,
    count(DISTINCT user_id) AS unique_users
FROM rmq_events
WHERE received_at >= now() - INTERVAL 1 HOUR
GROUP BY event_type
ORDER BY total DESC;

-- Message arrival rate per minute
SELECT
    toStartOfMinute(received_at) AS minute,
    count()                      AS messages
FROM rmq_events
WHERE received_at >= now() - INTERVAL 30 MINUTE
GROUP BY minute
ORDER BY minute;
```

## Summary

ClickHouse's RabbitMQ engine provides a direct AMQP consumer that pairs with a materialized view to persist messages into MergeTree tables. Configure the exchange type, routing keys, and consumer count to match your RabbitMQ topology. Use persistent queues and durable exchanges to avoid message loss, monitor the consumer state through `system.rabbitmq_consumers`, and restart stalled consumers with DETACH/ATTACH.
