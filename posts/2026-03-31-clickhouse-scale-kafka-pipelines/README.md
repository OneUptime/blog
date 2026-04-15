# How to Scale Kafka-to-ClickHouse Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka, Pipeline, Scaling, Performance

Description: Scale Kafka-to-ClickHouse pipelines horizontally by distributing consumers across cluster nodes, tuning partition counts, and using Distributed tables for fan-out writes.

---

As your event volume grows, a single Kafka-to-ClickHouse consumer will eventually become a bottleneck. Scaling the pipeline means adding consumer parallelism, distributing write load across ClickHouse nodes, and ensuring your Kafka topic has enough partitions to support the desired concurrency.

## Current Throughput Baseline

Before scaling, measure your current throughput:

```sql
SELECT
    count() AS total_rows,
    min(event_time) AS oldest,
    max(event_time) AS newest,
    count() / 3600.0 AS avg_rows_per_second
FROM events
WHERE event_time >= now() - INTERVAL 1 HOUR;
```

## Scaling Kafka Partitions

Each ClickHouse consumer thread can handle one Kafka partition. To increase concurrency, increase the partition count:

```bash
# Increase events topic to 24 partitions
kafka-topics.sh --bootstrap-server kafka:9092 \
    --alter --topic events \
    --partitions 24
```

Note: Partition count can only be increased, not decreased. Plan for future scale when initially creating topics.

## Scaling Consumer Threads on a Single Node

```sql
ALTER TABLE kafka_events_raw MODIFY SETTING
    kafka_num_consumers = 8;  -- Use 8 of 24 partitions
```

Restart the consumer after modifying:

```sql
DETACH TABLE kafka_events_raw;
ATTACH TABLE kafka_events_raw;
```

## Distributing Consumers Across Nodes

For very high throughput, distribute consumers across ClickHouse nodes using the same consumer group:

```sql
-- Run on each of 3 ClickHouse nodes with kafka_num_consumers = 8
-- Kafka will assign 8 partitions to each node (24 total)
CREATE TABLE kafka_events_raw (
    event_time String,
    user_id String,
    event_type String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'events',
    kafka_group_name = 'clickhouse-consumers',  -- Same group on all nodes
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 8;
```

## Writing to Distributed Tables

When consumers are on multiple nodes, write to a Distributed table so each node writes locally but data is visible cluster-wide:

```sql
-- Local table on each node
CREATE TABLE events_local (
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String)
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);

-- Distributed table for queries across all shards
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String)
) ENGINE = Distributed('my_cluster', 'mydb', 'events_local', rand());

-- Materialized view writes to local table
CREATE MATERIALIZED VIEW events_mv TO events_local AS
SELECT
    toDateTime(event_time) AS event_time,
    toUInt64(user_id) AS user_id,
    event_type
FROM kafka_events_raw;
```

## Tuning Kafka Engine Batch Size

The Kafka engine batches rows before writing through the materialized view. Tune the batch size to balance throughput and latency:

```sql
ALTER TABLE kafka_events_raw MODIFY SETTING
    kafka_max_block_size = 65536,         -- rows per batch (default 65536)
    kafka_poll_timeout_ms = 5000,         -- max wait per poll cycle in ms
    kafka_flush_interval_ms = 7500;       -- max time before flushing a batch in ms
```

## Throughput Benchmarking

After scaling, verify improved throughput:

```sql
SELECT
    hostName() AS node,
    toStartOfMinute(event_time) AS minute,
    count() AS rows_per_minute
FROM clusterAllReplicas('my_cluster', events_local)
WHERE event_time >= now() - INTERVAL 10 MINUTE
GROUP BY node, minute
ORDER BY node, minute;
```

## Summary

Scaling Kafka-to-ClickHouse pipelines starts with increasing Kafka partition count to enable parallelism, then distributing consumers across ClickHouse nodes with `kafka_num_consumers`, and routing writes through a Distributed table so each node writes locally. Benchmark throughput before and after each change to confirm scaling is delivering the expected improvement.
