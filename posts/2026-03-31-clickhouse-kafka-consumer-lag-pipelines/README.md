# How to Handle Kafka Consumer Lag in ClickHouse Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka, Consumer Lag, Pipeline, Monitoring

Description: Monitor and resolve Kafka consumer lag in ClickHouse pipelines by tracking offset progress, tuning consumer settings, and scaling consumers to match producer throughput.

---

Kafka consumer lag in a ClickHouse pipeline means the consumer is falling behind the producer - messages are piling up in Kafka faster than ClickHouse can ingest them. Left unaddressed, lag grows until you hit Kafka's retention limit and start losing data.

## Monitoring Consumer Lag from ClickHouse

```sql
SELECT
    database,
    table,
    consumer_id,
    assignments.topic AS topics,
    assignments.partition_id AS partitions,
    assignments.current_offset AS current_offsets,
    last_poll_time,
    num_messages_read,
    num_commits
FROM system.kafka_consumers;
```

This shows the partitions assigned to each consumer and the last committed offset per partition. `system.kafka_consumers` does not expose the broker's high watermark, so true lag (high watermark - current offset) must be computed by comparing these offsets against the values reported by `kafka-consumer-groups.sh` below. Alert when the gap exceeds your acceptable threshold.

## Monitoring Lag from the Kafka Side

```bash
# Using kafka-consumer-groups.sh
kafka-consumer-groups.sh \
    --bootstrap-server kafka:9092 \
    --describe \
    --group clickhouse-consumer
```

## Common Causes of Consumer Lag

1. **Slow ClickHouse inserts**: Merges are throttling inserts due to too many parts
2. **Low poll interval**: ClickHouse is not polling Kafka frequently enough
3. **Large message payloads**: Each message takes longer to parse and insert
4. **Single consumer thread**: One consumer cannot keep up with partition volume

## Tuning Consumer Settings

Adjust the Kafka Engine settings to process larger batches:

```sql
ALTER TABLE kafka_events_raw MODIFY SETTING
    kafka_max_block_size = 131072,  -- Process 128K messages at once
    kafka_poll_max_batch_size = 10000,
    kafka_flush_interval_ms = 1000;  -- Flush every 1 second
```

## Adding Consumer Threads

Scale ingestion by increasing the number of consumer threads. For a topic with 12 partitions:

```sql
CREATE TABLE kafka_events_raw (
    -- same schema as before
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'events',
    kafka_group_name = 'clickhouse-consumer',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 6;  -- Use 6 of 12 partitions
```

Each ClickHouse node can consume up to `kafka_num_consumers` partitions in parallel. To use all 12 partitions, set `kafka_num_consumers = 12` on a single node, or split across nodes with the same consumer group.

## Distributed Consumer Setup

For high-throughput pipelines, distribute consumers across ClickHouse nodes:

```sql
-- On each of 3 nodes, consume 4 partitions each
-- All nodes use the same consumer group
CREATE TABLE kafka_events_raw ... SETTINGS kafka_num_consumers = 4;
```

Kafka will assign non-overlapping partitions to each node in the same consumer group.

## Checking Insert Throughput

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS rows_inserted
FROM system.query_log
WHERE type = 'QueryFinish'
    AND query_kind = 'Insert'
    AND event_time >= now() - INTERVAL 30 MINUTE
GROUP BY minute
ORDER BY minute;
```

Compare against Kafka producer throughput to understand whether the gap is widening or closing.

## Resetting Consumer Offset After Lag

If lag has grown too large and you want to skip to the current offset:

```bash
# Stop ClickHouse consumer first (detach the table)
clickhouse-client --query "DETACH TABLE kafka_events_raw"

# Reset offset to latest
kafka-consumer-groups.sh \
    --bootstrap-server kafka:9092 \
    --group clickhouse-consumer \
    --topic events \
    --reset-offsets \
    --to-latest \
    --execute

# Re-attach
clickhouse-client --query "ATTACH TABLE kafka_events_raw"
```

## Summary

Kafka consumer lag in ClickHouse pipelines is addressed by increasing `kafka_num_consumers` to parallelize consumption, tuning `kafka_max_block_size` for larger batches, and distributing consumers across multiple ClickHouse nodes for very high-throughput scenarios. Monitor lag per partition, alert early, and have a clear runbook for resetting offsets if lag becomes unrecoverable within your retention window.
