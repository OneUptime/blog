# How to Use the Kappa Architecture with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kappa Architecture, Stream Processing, Kafka, Data Architecture

Description: Implement the Kappa architecture with ClickHouse by treating all data as a stream, eliminating the batch layer for simpler operations and lower latency.

---

## Kappa vs Lambda Architecture

The Kappa architecture, proposed by Jay Kreps, simplifies Lambda by removing the separate batch layer. Everything flows through a single streaming pipeline. When reprocessing is needed, you replay the stream from the source (typically Kafka) rather than running a separate batch job.

This works well when:
- Your event log (Kafka) has sufficient retention for full reprocessing
- Streaming computations are idempotent or use deduplication
- Operational simplicity is more valuable than batch-optimized accuracy

## ClickHouse in a Kappa Architecture

ClickHouse serves as the real-time analytical store. Events flow from Kafka into ClickHouse continuously, and queries run directly against the ingested data without a separate batch aggregation step.

## Setting Up the Streaming Ingestion

```sql
-- Raw event store
CREATE TABLE raw_events (
    event_id    UUID DEFAULT generateUUIDv4(),
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    payload     String
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time, event_id);

-- Kafka source table
CREATE TABLE raw_events_kafka (
    event_time  DateTime,
    user_id     UInt64,
    event_type  String,
    payload     String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'raw_events',
    kafka_group_name = 'ch_kappa',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 4;

-- Materialized view wires Kafka to the main table
CREATE MATERIALIZED VIEW raw_events_mv TO raw_events AS
SELECT event_time, user_id, event_type, payload
FROM raw_events_kafka;
```

## Real-Time Aggregations with Materialized Views

Instead of batch jobs, use incremental materialized views for aggregations:

```sql
CREATE MATERIALIZED VIEW hourly_event_counts
ENGINE = SummingMergeTree()
ORDER BY (hour, user_id, event_type)
AS
SELECT
    toStartOfHour(event_time) AS hour,
    user_id,
    event_type,
    count() AS cnt
FROM raw_events
GROUP BY hour, user_id, event_type;
```

Every insert into `raw_events` automatically updates `hourly_event_counts`.

## Reprocessing with Kappa

When business logic changes, replay the Kafka topic into a new ClickHouse table from the beginning of the retention window:

```bash
# Reset the consumer group offset to the beginning
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group ch_kappa_v2 --reset-offsets --to-earliest \
  --topic raw_events --execute
```

Point the new consumer to a parallel table `raw_events_v2`, validate results, then cut over.

## Deduplication at Query Time

Since stream processing may deliver duplicates, use `FINAL` for exact counts:

```sql
SELECT user_id, count() AS unique_events
FROM raw_events FINAL
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY user_id
ORDER BY unique_events DESC
LIMIT 20;
```

## Comparing with Lambda

The Kappa architecture is operationally simpler - no batch pipeline to maintain. The tradeoff is that historical reprocessing requires enough Kafka retention to replay the full dataset, which may not be feasible for multi-year histories.

## Summary

The Kappa architecture with ClickHouse uses continuous stream ingestion via the Kafka table engine and incremental materialized views to deliver real-time analytics without a separate batch layer, trading some flexibility for significant operational simplicity.
