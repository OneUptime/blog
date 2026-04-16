# How to Build a RabbitMQ to ClickHouse Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RabbitMQ, Streaming, ETL, Real-Time Analytics

Description: Build a real-time data pipeline from RabbitMQ to ClickHouse using the RabbitMQ table engine and materialized views for streaming analytics.

---

## Overview

ClickHouse has a native `RabbitMQ` table engine that consumes messages from a RabbitMQ exchange directly. Combined with a materialized view, you can build a streaming pipeline that writes messages to ClickHouse as they arrive.

The pipeline architecture:

```text
RabbitMQ Exchange
    -> ClickHouse RabbitMQ Table (message buffer)
    -> Materialized View (transformation)
    -> Target MergeTree Table (persistent storage)
```

## Prerequisites

- RabbitMQ running and accessible from ClickHouse
- A RabbitMQ exchange with messages in JSON format
- ClickHouse with `rabbitmq` engine support (enabled by default)

## Step 1 - Enable the RabbitMQ Engine

In `/etc/clickhouse-server/config.xml`:

```xml
<rabbitmq>
    <!-- No special configuration needed here -->
    <!-- Connection details go in the table DDL -->
</rabbitmq>
```

## Step 2 - Create the RabbitMQ Source Table

```sql
-- This table reads from RabbitMQ but does NOT store data permanently
CREATE TABLE analytics.events_rabbitmq_source
(
    user_id   UInt64,
    event_type String,
    event_time DateTime,
    revenue   Float64,
    metadata  String
)
ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port = 'rabbitmq.internal:5672',
    rabbitmq_exchange_name = 'analytics_events',
    rabbitmq_exchange_type = 'topic',
    rabbitmq_format = 'JSONEachRow',
    rabbitmq_queue_base = 'clickhouse_events',
    rabbitmq_routing_key_list = 'events.purchase,events.click,events.view',
    rabbitmq_username = 'clickhouse_consumer',
    rabbitmq_password = 'RabbitPass!',
    rabbitmq_num_consumers = 4,
    rabbitmq_num_queues = 2;
```

## Step 3 - Create the Target Storage Table

```sql
CREATE TABLE analytics.events
(
    event_date  Date        MATERIALIZED toDate(event_time),
    user_id     UInt64,
    event_type  LowCardinality(String),
    event_time  DateTime,
    revenue     Float64,
    metadata    String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id, event_time)
TTL event_date + INTERVAL 90 DAY;
```

## Step 4 - Create the Materialized View Connector

```sql
-- MV moves data from the RabbitMQ buffer to the storage table
CREATE MATERIALIZED VIEW analytics.events_rabbitmq_mv
TO analytics.events AS
SELECT
    user_id,
    event_type,
    event_time,
    revenue,
    metadata
FROM analytics.events_rabbitmq_source;
```

Once the MV is created, ClickHouse automatically starts consuming from RabbitMQ.

## Step 5 - Verify the Pipeline

```bash
# Publish a test message to RabbitMQ
python3 - << 'EOF'
import pika
import json
from datetime import datetime

connection = pika.BlockingConnection(pika.URLParameters('amqp://guest:guest@rabbitmq.internal/'))
channel = connection.channel()
channel.exchange_declare(exchange='analytics_events', exchange_type='topic', durable=True)

message = {
    "user_id": 1001,
    "event_type": "purchase",
    "event_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    "revenue": 49.99,
    "metadata": '{"product_id": "SKU-123"}'
}

channel.basic_publish(
    exchange='analytics_events',
    routing_key='events.purchase',
    body=json.dumps(message)
)
connection.close()
print("Message published.")
EOF
```

```sql
-- Verify the message arrived in ClickHouse
SELECT * FROM analytics.events WHERE user_id = 1001 ORDER BY event_time DESC LIMIT 5;
```

## Monitoring the Pipeline

```sql
-- Check RabbitMQ-related metrics (ClickHouse has no dedicated
-- system.rabbitmq_consumers table; use system.metrics / system.events)
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%RabbitMQ%';

-- Monitor ingestion rate
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS events_per_minute
FROM analytics.events
WHERE event_time > now() - INTERVAL 30 MINUTE
GROUP BY minute
ORDER BY minute;
```

## Handling Message Failures

```sql
-- Skip messages that fail to parse (up to N per block) instead of
-- halting the consumer. For actual dead-letter routing, configure it
-- on the RabbitMQ queue via rabbitmq_queue_settings_list
-- (e.g. 'x-dead-letter-exchange=my-dlx').
ALTER TABLE analytics.events_rabbitmq_source MODIFY SETTING
    rabbitmq_skip_broken_messages = 100;
```

## Scaling the Pipeline

```sql
-- Increase consumers for higher throughput
ALTER TABLE analytics.events_rabbitmq_source MODIFY SETTING
    rabbitmq_num_consumers = 8,
    rabbitmq_num_queues = 4,
    rabbitmq_max_block_size = 65536;
```

## Summary

ClickHouse's native RabbitMQ engine enables real-time streaming pipelines without external connectors. The pattern uses a RabbitMQ table as a message buffer, a materialized view as the transformation layer, and a MergeTree table for persistent storage. Tune `rabbitmq_num_consumers` and `rabbitmq_num_queues` for throughput, use `rabbitmq_skip_broken_messages` for fault tolerance, and monitor ingestion lag by comparing message timestamps with ingestion time.
