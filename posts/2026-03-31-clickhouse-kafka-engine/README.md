# How to Use Kafka Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka, Storage Engine, Streaming, Ingestion

Description: Learn how to use the Kafka table engine in ClickHouse to consume messages from Apache Kafka topics in real time and persist them into MergeTree tables via materialized views.

---

The `Kafka` table engine connects ClickHouse directly to one or more Apache Kafka topics. Reading from a Kafka table consumes messages and advances the consumer group offset. Because reading is destructive (offsets are committed on read), the Kafka engine is almost always paired with a materialized view that redirects consumed messages into a persistent MergeTree table. This three-part pattern - Kafka engine, Materialized View, MergeTree storage - is the standard ClickHouse streaming ingestion architecture.

## Creating a Kafka Engine Table

```sql
CREATE TABLE kafka_raw_events
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  String,
    page        String,
    duration_ms UInt32,
    country     String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list     = 'kafka-broker-01:9092,kafka-broker-02:9092',
    kafka_topic_list      = 'user-events',
    kafka_group_name      = 'clickhouse-consumer-group',
    kafka_format          = 'JSONEachRow',
    kafka_num_consumers   = 4,
    kafka_max_block_size  = 65536;
```

Key settings:
- `kafka_broker_list` - comma-separated `host:port` list of Kafka brokers
- `kafka_topic_list` - comma-separated topic names to consume
- `kafka_group_name` - consumer group ID; ClickHouse tracks offsets per group
- `kafka_format` - any ClickHouse format: `JSONEachRow`, `Avro`, `ProtobufSingle`, `CSV`, etc.
- `kafka_num_consumers` - number of consumer threads per table
- `kafka_max_block_size` - maximum rows in a single read batch

## Creating the Destination MergeTree Table

```sql
CREATE TABLE events
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    duration_ms UInt32,
    country     LowCardinality(String),
    ingested_at DateTime DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);
```

## Creating the Materialized View

The materialized view reads from the Kafka table and writes to the MergeTree table. It fires automatically for each consumed batch.

```sql
CREATE MATERIALIZED VIEW mv_kafka_events
TO events
AS
SELECT
    event_time,
    user_id,
    event_type,
    page,
    duration_ms,
    country
FROM kafka_raw_events;
```

Once this view exists, ClickHouse begins consuming from Kafka automatically and persisting rows into `events`.

## Producing Test Messages

Use `kafkacat` or `kafka-console-producer` to send test messages.

```bash
# Produce JSON messages to the user-events topic
echo '{"event_time":"2024-06-15 10:00:00","user_id":1001,"event_type":"page_view","page":"/home","duration_ms":320,"country":"US"}' \
  | kafkacat -P -b kafka-broker-01:9092 -t user-events

echo '{"event_time":"2024-06-15 10:01:00","user_id":1002,"event_type":"click","page":"/pricing","duration_ms":0,"country":"DE"}' \
  | kafkacat -P -b kafka-broker-01:9092 -t user-events
```

## Verifying Consumption

```sql
-- Check that rows arrived in the MergeTree table
SELECT count(), max(ingested_at) FROM events;
```

```text
count()  max(ingested_at)
2        2024-06-15 10:01:05
```

## Schema With Nested JSON

For messages with nested JSON payloads, extract fields using ClickHouse JSON functions.

```sql
CREATE TABLE kafka_raw_logs
(
    raw_message String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list  = 'kafka-broker-01:9092',
    kafka_topic_list   = 'app-logs',
    kafka_group_name   = 'ch-logs-consumer',
    kafka_format       = 'JSONAsString';

CREATE TABLE app_logs
(
    ts          DateTime,
    level       LowCardinality(String),
    service     String,
    message     String,
    trace_id    String,
    ingested_at DateTime DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY (ts, level, service);

CREATE MATERIALIZED VIEW mv_kafka_logs
TO app_logs
AS
SELECT
    parseDateTime(JSONExtractString(raw_message, 'ts'), '%Y-%m-%dT%H:%i:%s') AS ts,
    JSONExtractString(raw_message, 'level')    AS level,
    JSONExtractString(raw_message, 'service')  AS service,
    JSONExtractString(raw_message, 'message')  AS message,
    JSONExtractString(raw_message, 'trace_id') AS trace_id
FROM kafka_raw_logs;
```

## Consuming Multiple Topics

```sql
CREATE TABLE kafka_multi_topic
(
    event_time DateTime,
    payload    String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list  = 'kafka-broker-01:9092',
    kafka_topic_list   = 'topic-a,topic-b,topic-c',
    kafka_group_name   = 'ch-multi-consumer',
    kafka_format       = 'JSONEachRow';
```

The virtual columns `_topic`, `_partition`, and `_offset` expose Kafka metadata. They are automatically provided by the Kafka engine and should not be declared in the `CREATE TABLE` statement; reference them directly in queries or materialized views, for example `SELECT _topic, _partition, _offset, event_time, payload FROM kafka_multi_topic`.

## Monitoring Consumer Lag

```sql
-- View consumer group status via the system table
SELECT
    database,
    table,
    consumer_id,
    assignments.topic        AS topic,
    assignments.partition_id AS partition,
    assignments.current_offset AS current_offset,
    num_messages_read,
    last_poll_time,
    last_commit_time
FROM system.kafka_consumers
ARRAY JOIN assignments
WHERE database = 'default' AND table = 'kafka_raw_events';
```

`system.kafka_consumers` does not expose a broker-side high watermark directly; to compute lag, query the broker high watermark with the Kafka CLI (for example `kafka-consumer-groups.sh --describe`) or parse the `rdkafka_stat` column, which contains librdkafka statistics including per-partition high watermark offsets.

## Resetting Consumer Offsets

To reprocess messages from the beginning of a topic, reset the consumer group offset outside ClickHouse.

```bash
# Stop ClickHouse consumption first (detach the table)
# Then reset offsets using kafka-consumer-groups CLI
kafka-consumer-groups.sh \
  --bootstrap-server kafka-broker-01:9092 \
  --group clickhouse-consumer-group \
  --topic user-events \
  --reset-offsets --to-earliest --execute
```

```sql
-- Restart consumption by re-attaching the table
ATTACH TABLE kafka_raw_events;
```

## Error Handling With a Dead Letter Queue

```sql
-- Capture malformed messages in a separate table
CREATE TABLE kafka_parse_errors
(
    raw_message  String,
    error_msg    String,
    received_at  DateTime DEFAULT now()
)
ENGINE = MergeTree
ORDER BY received_at;

-- Use a conditional MV that writes errors to the DLQ.
-- This consumes from the raw-string Kafka table (kafka_raw_logs) defined earlier
-- and routes messages that are missing a required field into the DLQ.
CREATE MATERIALIZED VIEW mv_kafka_errors
TO kafka_parse_errors
AS
SELECT
    raw_message,
    'missing_required_field' AS error_msg
FROM kafka_raw_logs
WHERE JSONExtractString(raw_message, 'service') = '';
```

## Summary

The `Kafka` engine provides native streaming ingestion from Apache Kafka into ClickHouse. Use it with a materialized view and a MergeTree destination to build a reliable, scalable, real-time ingestion pipeline. Key parameters are `kafka_format`, `kafka_group_name` (for offset tracking), and `kafka_num_consumers` (for throughput). Monitor consumer lag via `system.kafka_consumers` and handle malformed messages with a dead letter queue materialized view.
