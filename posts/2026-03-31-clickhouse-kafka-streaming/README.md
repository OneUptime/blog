# How to Stream Data from Kafka to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka, Streaming, Data Engineering, Analytics

Description: Learn how to ingest real-time event streams from Apache Kafka into ClickHouse using the Kafka table engine, materialized views, and best practices for production pipelines.

---

> ClickHouse's native Kafka engine lets you consume topics directly without any external connectors or middleware.

Streaming data from Kafka into ClickHouse is one of the most common real-time analytics patterns. ClickHouse has a built-in Kafka table engine that reads from Kafka topics and, combined with a materialized view, writes data into a storage table. This guide covers the full setup from broker configuration through production-ready pipelines.

---

## Prerequisites

Make sure you have the following before starting.

```bash
# Verify ClickHouse version (Kafka engine requires 20.1+)
clickhouse-client --query "SELECT version()"

# Check Kafka broker is reachable
kafka-broker-api-versions.sh --bootstrap-server localhost:9092
```

## Creating the Kafka Topic

Create a topic for your events before setting up ClickHouse.

```bash
# Create a topic with 4 partitions and replication factor 1
kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create \
  --topic user_events \
  --partitions 4 \
  --replication-factor 1

# Verify the topic exists
kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic user_events
```

## Setting Up the Storage Table

Create the destination table where processed data will be stored.

```sql
CREATE TABLE user_events
(
    event_id    UUID,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    ts          DateTime64(3),
    ip          IPv4,
    country     LowCardinality(String),
    properties  String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (user_id, ts)
TTL ts + INTERVAL 90 DAY;
```

## Creating the Kafka Table Engine

The Kafka engine acts as a consumer that reads raw messages from the topic.

```sql
CREATE TABLE kafka_user_events
(
    event_id    String,
    user_id     UInt64,
    event_type  String,
    page        String,
    ts          String,
    ip          String,
    country     String,
    properties  String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list     = 'localhost:9092',
    kafka_topic_list      = 'user_events',
    kafka_group_name      = 'clickhouse_consumer_group',
    kafka_format          = 'JSONEachRow',
    kafka_num_consumers   = 4,
    kafka_max_block_size  = 65536,
    kafka_skip_broken_messages = 100;
```

## Creating the Materialized View

The materialized view bridges the Kafka engine to the storage table, applying any transformations needed.

```sql
CREATE MATERIALIZED VIEW mv_kafka_user_events TO user_events AS
SELECT
    toUUID(event_id)               AS event_id,
    user_id,
    event_type,
    page,
    parseDateTimeBestEffort(ts)    AS ts,
    toIPv4(ip)                     AS ip,
    country,
    properties
FROM kafka_user_events;
```

## Producing Test Messages

Send sample JSON messages to verify the pipeline works end to end.

```bash
# Produce a single test message
echo '{"event_id":"550e8400-e29b-41d4-a716-446655440000","user_id":42,"event_type":"page_view","page":"/home","ts":"2026-03-31T12:00:00.000Z","ip":"203.0.113.10","country":"US","properties":"{}"}' \
  | kafka-console-producer.sh \
      --bootstrap-server localhost:9092 \
      --topic user_events

# Produce 1000 messages with a script
python3 - <<'PYEOF'
import json, uuid, random, time
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

countries = ['US', 'GB', 'DE', 'FR', 'JP']
events    = ['page_view', 'click', 'purchase', 'signup', 'logout']

for _ in range(1000):
    msg = {
        'event_id':   str(uuid.uuid4()),
        'user_id':    random.randint(1, 10000),
        'event_type': random.choice(events),
        'page':       f'/page-{random.randint(1, 50)}',
        'ts':         time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
        'ip':         f'203.0.113.{random.randint(1, 254)}',
        'country':    random.choice(countries),
        'properties': '{}'
    }
    producer.send('user_events', msg)

producer.flush()
print('Done sending 1000 messages')
PYEOF
```

## Verifying Data Ingestion

Query the storage table to confirm data arrived correctly.

```sql
-- Check row count
SELECT count() FROM user_events;

-- Check the most recent events
SELECT
    event_id,
    user_id,
    event_type,
    ts,
    country
FROM user_events
ORDER BY ts DESC
LIMIT 10;

-- Check consumer group offset using system tables
SELECT *
FROM system.kafka_consumers
WHERE database = 'default'
  AND table = 'kafka_user_events';
```

## Handling Schema Evolution

When your Kafka message schema changes, handle it gracefully.

```sql
-- Add a new nullable column to the storage table without breaking existing data
ALTER TABLE user_events
    ADD COLUMN session_id String DEFAULT '';

-- Update the Kafka source table to match
ALTER TABLE kafka_user_events
    ADD COLUMN session_id String DEFAULT '';

-- Update the materialized view (requires recreating it)
DROP VIEW mv_kafka_user_events;

CREATE MATERIALIZED VIEW mv_kafka_user_events TO user_events AS
SELECT
    toUUID(event_id)            AS event_id,
    user_id,
    event_type,
    page,
    parseDateTimeBestEffort(ts) AS ts,
    toIPv4(ip)                  AS ip,
    country,
    properties,
    session_id
FROM kafka_user_events;
```

## Using Avro Format

For schema-enforced messages, use Avro with a Schema Registry.

```sql
-- Create a Kafka table that reads Avro-encoded messages
CREATE TABLE kafka_user_events_avro
(
    event_id   String,
    user_id    UInt64,
    event_type String,
    ts         Int64
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list               = 'localhost:9092',
    kafka_topic_list                = 'user_events_avro',
    kafka_group_name                = 'ch_avro_group',
    kafka_format                    = 'AvroConfluent',
    format_avro_schema_registry_url = 'http://localhost:8081',
    kafka_num_consumers             = 2;
```

## Scaling with Multiple Consumers

For high-throughput topics, increase consumer parallelism.

```sql
-- Drop and recreate the Kafka table with more consumers
DROP TABLE kafka_user_events;

CREATE TABLE kafka_user_events
(
    event_id    String,
    user_id     UInt64,
    event_type  String,
    page        String,
    ts          String,
    ip          String,
    country     String,
    properties  String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list           = 'kafka1:9092,kafka2:9092,kafka3:9092',
    kafka_topic_list            = 'user_events',
    kafka_group_name            = 'clickhouse_consumer_group',
    kafka_format                = 'JSONEachRow',
    kafka_num_consumers         = 8,
    kafka_max_block_size        = 131072,
    kafka_poll_timeout_ms       = 500,
    kafka_flush_interval_ms     = 7500,
    kafka_handle_error_mode     = 'stream';
```

## Monitoring Consumer Lag

Keep an eye on how far behind the consumer is.

```sql
-- View Kafka consumer status
SELECT
    database,
    table,
    consumer_id,
    assignments.topic          AS topics,
    assignments.partition_id   AS partitions,
    assignments.current_offset AS current_offsets,
    num_messages_read,
    last_poll_time,
    last_commit_time
FROM system.kafka_consumers
WHERE database = 'default';
```

```bash
# Check consumer group lag from the Kafka side
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group clickhouse_consumer_group
```

## Dead Letter Queue

Route malformed messages to a separate table instead of skipping them.

```sql
-- Create a dead letter table
CREATE TABLE kafka_dlq
(
    raw_message String,
    error       String,
    received_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY received_at
TTL received_at + INTERVAL 7 DAY;

-- The source Kafka table must be created with kafka_handle_error_mode = 'stream'
-- for the _raw_message and _error virtual columns to be populated on parse failures.
CREATE MATERIALIZED VIEW mv_kafka_dlq TO kafka_dlq AS
SELECT
    _raw_message AS raw_message,
    _error       AS error,
    now()        AS received_at
FROM kafka_user_events
WHERE length(_error) > 0;
```

## Summary

Streaming data from Kafka to ClickHouse relies on three components: a Kafka engine table that acts as a consumer, a MergeTree storage table that holds the data, and a materialized view that connects the two while applying transformations. Tune `kafka_num_consumers` to match your topic partition count, monitor consumer lag through `system.kafka_consumers`, and use a dead letter queue for malformed messages. For schema-enforced pipelines, use the Avro format with a Schema Registry.
