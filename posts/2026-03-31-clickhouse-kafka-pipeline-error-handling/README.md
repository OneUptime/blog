# How to Build a Kafka to ClickHouse Pipeline with Error Handling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka, Pipeline, Error Handling, Streaming

Description: Build a reliable Kafka to ClickHouse data pipeline with schema validation, dead-letter queues, and retry logic to handle malformed and failed messages gracefully.

---

A Kafka to ClickHouse pipeline is one of the most common high-throughput ingestion patterns. Without proper error handling, a single malformed message or schema mismatch can stall your entire consumer and cause data loss. This guide covers building a resilient pipeline with validation, retries, and dead-letter queues.

## Pipeline Architecture

```text
Kafka Topic (events)
    |
    v
Schema Validation Layer
    |-- Valid messages --> ClickHouse Kafka Engine Table
    |-- Invalid messages --> Dead Letter Topic (events.dlq)
    |
    v
ClickHouse Materialized View --> Target Table
```

## Setting Up the Kafka Engine Table

```sql
CREATE TABLE kafka_events_raw (
    event_time String,
    user_id String,
    event_type String,
    payload String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'events',
    kafka_group_name = 'clickhouse-consumer',
    kafka_format = 'JSONEachRow',
    kafka_max_block_size = 65536,
    kafka_skip_broken_messages = 10,
    kafka_handle_error_mode = 'stream';
```

The `kafka_handle_error_mode = 'stream'` setting is key - it routes parse errors to a special `_error` virtual column rather than stopping the consumer.

## Handling Parse Errors with stream Mode

```sql
CREATE TABLE kafka_events_errors (
    error_time DateTime DEFAULT now(),
    raw_message String,
    error_reason String
) ENGINE = MergeTree
ORDER BY error_time
TTL error_time + INTERVAL 7 DAY;

-- Materialized view that captures parse errors
CREATE MATERIALIZED VIEW kafka_events_error_mv
TO kafka_events_errors
AS
SELECT
    now() AS error_time,
    _raw_message AS raw_message,
    _error AS error_reason
FROM kafka_events_raw
WHERE length(_error) > 0;
```

## Schema Validation in the Materialized View

```sql
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    payload String
) ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);

CREATE MATERIALIZED VIEW events_mv
TO events
AS
SELECT
    toDateTime(event_time) AS event_time,
    toUInt64OrNull(user_id) AS user_id,
    event_type,
    payload
FROM kafka_events_raw
WHERE
    length(_error) = 0
    AND isNotNull(toUInt64OrNull(user_id))
    AND event_type IN ('click', 'view', 'purchase', 'signup');
```

Messages failing the WHERE clause are silently dropped. Capture them to a separate table using a second materialized view for investigation.

## Retry Logic for Transient Failures

If ClickHouse is temporarily unavailable, the Kafka consumer pauses automatically - Kafka retains unread messages. Configure appropriate retention:

```bash
# Set Kafka topic retention to 7 days
kafka-configs.sh --bootstrap-server kafka:9092 \
    --alter --entity-type topics --entity-name events \
    --add-config retention.ms=604800000
```

## Monitoring Pipeline Health

```sql
SELECT
    database,
    table,
    consumer_id,
    assignments.topic,
    assignments.partition_id,
    assignments.current_offset,
    num_messages_read,
    last_poll_time
FROM system.kafka_consumers;
```

## Dead Letter Queue Consumer

Route failed messages from the DLQ for manual review or replay:

```sql
CREATE TABLE kafka_events_dlq (
    message String,
    error_code String,
    original_topic String,
    original_partition UInt32,
    original_offset UInt64,
    failed_at DateTime
) ENGINE = MergeTree
ORDER BY failed_at
TTL failed_at + INTERVAL 30 DAY;
```

## Summary

A reliable Kafka to ClickHouse pipeline uses `kafka_handle_error_mode = 'stream'` to capture parse errors without stopping the consumer, materialized views for schema validation and routing, and separate tables for failed messages. Pair with Kafka topic retention policies and consumer lag monitoring to ensure end-to-end reliability and observability.
