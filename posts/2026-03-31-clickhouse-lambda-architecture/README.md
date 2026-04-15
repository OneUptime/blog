# How to Use the Lambda Architecture with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lambda Architecture, Batch Processing, Stream Processing, Data Architecture

Description: Implement the Lambda architecture with ClickHouse as the serving layer, combining batch and streaming paths for accurate, low-latency analytics.

---

## What Is the Lambda Architecture

The Lambda architecture splits data processing into three layers:

- **Batch layer** - processes all historical data with high accuracy
- **Speed layer** - processes recent data with low latency
- **Serving layer** - merges batch and speed results to answer queries

ClickHouse excels as the serving layer because it can query both large historical datasets and freshly ingested data at the same time.

## Batch Layer with ClickHouse

The batch layer reprocesses all data on a schedule (daily or hourly) and writes results into a ClickHouse batch table:

```sql
CREATE TABLE events_batch (
    event_date  Date,
    user_id     UInt64,
    event_type  LowCardinality(String),
    count       UInt64
) ENGINE = ReplacingMergeTree()
ORDER BY (event_date, user_id, event_type);
```

A Spark or dbt job computes these aggregates and inserts them:

```bash
spark-submit --master yarn batch_aggregate.py --date 2026-03-30
```

## Speed Layer for Recent Data

The speed layer ingests raw events from Kafka into a real-time table:

```sql
CREATE TABLE events_realtime (
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toDate(event_time)
ORDER BY (user_id, event_time)
TTL event_time + INTERVAL 48 HOUR DELETE;
```

Use ClickHouse's built-in Kafka engine to consume events directly:

```sql
CREATE TABLE events_kafka_queue (
    event_time  DateTime,
    user_id     UInt64,
    event_type  String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'user_events',
    kafka_group_name = 'clickhouse_consumer',
    kafka_format = 'JSONEachRow';

CREATE MATERIALIZED VIEW events_mv TO events_realtime AS
SELECT event_time, user_id, event_type
FROM events_kafka_queue;
```

## Serving Layer - Merging Both Paths

A view merges batch results with real-time data for query time:

```sql
CREATE VIEW events_serving AS
    SELECT event_date, user_id, event_type, sum(count) AS total
    FROM events_batch
    GROUP BY event_date, user_id, event_type
UNION ALL
    SELECT toDate(event_time), user_id, event_type, count() AS total
    FROM events_realtime
    WHERE toDate(event_time) > (SELECT max(event_date) FROM events_batch)
    GROUP BY 1, 2, 3;
```

Queries against `events_serving` always see both historical accuracy and real-time freshness.

## Handling the Overlap

The batch layer covers data up to the previous day. The speed layer covers the last 48 hours. The `WHERE` clause in the union ensures no double-counting.

## When the Batch Job Catches Up

Once the batch job runs and covers data already in the speed layer, the `WHERE` clause in the serving view automatically excludes real-time rows that the batch layer now covers. If the batch job inserts updated aggregates for the same `(event_date, user_id, event_type)` key, `ReplacingMergeTree` deduplicates within `events_batch` itself. Use the `FINAL` keyword to get deduplicated results at query time:

```sql
SELECT * FROM events_batch FINAL WHERE event_date = today() - 1;
```

## Summary

The Lambda architecture with ClickHouse combines batch accuracy and streaming freshness. ClickHouse's columnar engine makes it well-suited for both the high-throughput serving layer and the real-time speed layer using the Kafka table engine.
