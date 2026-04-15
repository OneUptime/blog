# How to Replace Pinot with ClickHouse for User-Facing Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Pinot, User-Facing Analytics, OLAP, Migration

Description: Replace Apache Pinot with ClickHouse for user-facing analytics to simplify your infrastructure while keeping sub-second query latency at scale.

---

## Why Consider Replacing Pinot

Apache Pinot is designed for user-facing analytics with strict latency requirements. It performs well but requires multiple services: Controller, Broker, Server, and Minion nodes, plus ZooKeeper for coordination. This operational complexity often outweighs the benefits for teams that do not need Pinot's most advanced features.

ClickHouse achieves similar sub-second latency on analytical queries with a simpler deployment model.

## Key Differences

| Feature | Apache Pinot | ClickHouse |
|---------|-------------|------------|
| Index types | Star-tree, Bloom, Sorted | Primary, Bloom, Sparse |
| Real-time ingestion | via Kafka | via Kafka Engine |
| SQL dialect | PQL / Pinot SQL | Standard SQL |
| Star-schema joins | Limited | Full SQL joins |
| Deployment | Multi-service | Single binary |

## Schema Migration

Pinot schema JSON translates to a ClickHouse DDL:

```sql
-- Pinot schema equivalent
CREATE TABLE user_events (
    event_time     DateTime,
    user_id        UInt64,
    session_id     String,
    event_type     LowCardinality(String),
    page           LowCardinality(String),
    device_type    LowCardinality(String),
    country        LowCardinality(String),
    duration_ms    UInt32
) ENGINE = MergeTree()
PARTITION BY toDate(event_time)
ORDER BY (user_id, event_time)
SETTINGS index_granularity = 8192;
```

Add bloom filter indexes for high-cardinality string lookups:

```sql
ALTER TABLE user_events
    ADD INDEX idx_session_id session_id TYPE bloom_filter GRANULARITY 4;
```

## Real-Time Ingestion

```sql
CREATE TABLE user_events_kafka (
    event_time     DateTime,
    user_id        UInt64,
    session_id     String,
    event_type     String,
    page           String,
    device_type    String,
    country        String,
    duration_ms    UInt32
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'user_events',
    kafka_group_name = 'ch_pinot_replacement',
    kafka_format = 'JSONEachRow';

CREATE MATERIALIZED VIEW user_events_mv TO user_events AS
SELECT event_time, user_id, session_id, event_type,
       page, device_type, country, duration_ms
FROM user_events_kafka;
```

## Pinot Query to ClickHouse SQL

```sql
-- Pinot query
SELECT page, count(*) AS views, avg(duration_ms)
FROM user_events
WHERE eventTime BETWEEN 1711843200000 AND 1711929600000
  AND country = 'US'
GROUP BY page
ORDER BY views DESC
LIMIT 20;

-- ClickHouse equivalent
SELECT page, count() AS views, avg(duration_ms)
FROM user_events
WHERE event_time BETWEEN '2026-03-31' AND '2026-04-01'
  AND country = 'US'
GROUP BY page
ORDER BY views DESC
LIMIT 20;
```

## Achieving Low Latency at Scale

For user-facing APIs serving thousands of concurrent queries, pre-aggregate common patterns with materialized views so the hot path is always a simple key lookup:

```sql
CREATE MATERIALIZED VIEW mv_page_stats
ENGINE = SummingMergeTree()
ORDER BY (event_date, page, country, device_type) AS
SELECT
    toDate(event_time) AS event_date,
    page, country, device_type,
    count() AS views,
    sum(duration_ms) AS total_duration_ms
FROM user_events
GROUP BY event_date, page, country, device_type;
```

## Summary

Replacing Apache Pinot with ClickHouse for user-facing analytics simplifies your infrastructure to a single binary deployment while delivering comparable sub-second latency through optimized table design, bloom filter indexes, and pre-aggregated materialized views.
