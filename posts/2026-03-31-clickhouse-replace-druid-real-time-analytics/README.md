# How to Replace Druid with ClickHouse for Real-Time Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Druid, Real-Time Analytics, Migration, OLAP

Description: Replace Apache Druid with ClickHouse for real-time analytics to reduce operational complexity while maintaining sub-second query performance.

---

## Why Replace Druid

Apache Druid is a powerful real-time OLAP database but comes with significant operational overhead: multiple node types (Broker, Coordinator, Historical, MiddleManager, Overlord), a dependency on Apache ZooKeeper, and a complex ingestion model.

ClickHouse offers comparable real-time analytics performance with a much simpler architecture - typically a single binary with optional ZooKeeper/ClickHouse Keeper for replication.

## Architecture Comparison

| Component | Druid | ClickHouse |
|-----------|-------|------------|
| Query node | Broker | Any node |
| Storage nodes | Historical | Data nodes |
| Ingestion | MiddleManager | Kafka Engine / clickhouse-client |
| Coordination | ZooKeeper + Coordinator | ClickHouse Keeper |
| Metadata | Derby/PostgreSQL | System tables |

## Migrating the Schema

Druid datasources map to ClickHouse tables. A typical Druid datasource schema:

```json
{
  "dataSource": "events",
  "granularitySpec": {"segmentGranularity": "HOUR"},
  "dimensionsSpec": {"dimensions": ["user_id", "event_type", "country"]},
  "metricsSpec": [{"type": "count", "name": "count"}, {"type": "doubleSum", "name": "revenue"}]
}
```

Translates to ClickHouse:

```sql
CREATE TABLE events (
    __time       DateTime,
    user_id      UInt64,
    event_type   LowCardinality(String),
    country      LowCardinality(String),
    count        UInt64,
    revenue      Float64
) ENGINE = SummingMergeTree()
PARTITION BY toStartOfHour(__time)
ORDER BY (__time, user_id, event_type, country);
```

## Real-Time Ingestion from Kafka

Druid uses a Kafka Indexing Service. ClickHouse uses the Kafka engine:

```sql
CREATE TABLE events_kafka_src (
    raw String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'user_events',
    kafka_group_name = 'ch_events',
    kafka_format = 'JSONAsString';

CREATE MATERIALIZED VIEW events_mv TO events AS
SELECT
    toDateTime(JSONExtractUInt(raw, 'timestamp') / 1000) AS __time,
    JSONExtractUInt(raw, 'user_id') AS user_id,
    JSONExtractString(raw, 'event_type') AS event_type,
    JSONExtractString(raw, 'country') AS country,
    1 AS count,
    JSONExtractFloat(raw, 'revenue') AS revenue
FROM events_kafka_src;
```

## Translating Druid SQL to ClickHouse SQL

Druid SQL is mostly standard; small differences exist in time functions:

```sql
-- Druid
SELECT TIME_FLOOR(__time, 'PT1H') AS hour, SUM(count)
FROM events
WHERE __time BETWEEN '2026-03-30' AND '2026-03-31'
GROUP BY 1;

-- ClickHouse equivalent
SELECT toStartOfHour(__time) AS hour, sum(count)
FROM events
WHERE __time BETWEEN '2026-03-30' AND '2026-03-31'
GROUP BY hour
ORDER BY hour;
```

## Segment Compaction Equivalent

Druid automatically compacts segments. In ClickHouse, merging happens in the background. To force optimization:

```sql
OPTIMIZE TABLE events FINAL;
```

## Summary

Replacing Druid with ClickHouse eliminates multi-component cluster management while delivering comparable real-time analytics performance through the Kafka table engine and SummingMergeTree, significantly reducing operational complexity.
