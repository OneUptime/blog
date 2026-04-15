# How to Build Real-Time Recommendation Features with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Recommendation, Real-Time Analytics, Materialized View, Analytics

Description: Learn how to power real-time recommendation features using ClickHouse by tracking user events and computing item affinities on the fly.

---

Recommendation engines need fast reads over large event histories. ClickHouse excels here because its columnar storage and vectorized execution let you aggregate millions of user-item interactions in milliseconds.

## Schema Design

Store raw interaction events in a MergeTree table, then pre-aggregate with a materialized view.

```sql
CREATE TABLE user_events
(
    user_id     UInt64,
    item_id     UInt64,
    event_type  LowCardinality(String),  -- 'view', 'click', 'purchase'
    score       Float32,
    ts          DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (user_id, ts);
```

Assign weights per event type and accumulate them in a materialized view:

```sql
CREATE MATERIALIZED VIEW item_affinity_mv
ENGINE = SummingMergeTree()
ORDER BY (user_id, item_id)
AS
SELECT
    user_id,
    item_id,
    sumIf(score, event_type = 'purchase') * 5 +
    sumIf(score, event_type = 'click')   * 2 +
    sumIf(score, event_type = 'view')    * 1 AS affinity
FROM user_events
GROUP BY user_id, item_id;
```

## Querying Top-N Recommendations

```sql
SELECT item_id, sum(affinity) AS total_affinity
FROM item_affinity_mv
WHERE user_id = 42
GROUP BY item_id
ORDER BY total_affinity DESC
LIMIT 10;
```

This query typically returns in under 5 ms even with tens of millions of events, because the materialized view has already done the heavy lifting.

## Collaborative Filtering Approximation

Find items popular among users who have a similar affinity profile:

```sql
SELECT
    b.item_id,
    sum(b.affinity) AS collaborative_score
FROM item_affinity_mv AS a
JOIN item_affinity_mv AS b ON a.user_id = b.user_id
WHERE a.user_id != 42
  AND a.item_id IN (
        SELECT item_id FROM item_affinity_mv WHERE user_id = 42
  )
GROUP BY b.item_id
ORDER BY collaborative_score DESC
LIMIT 10;
```

## Keeping Data Fresh

Use a Kafka table engine to stream events directly into `user_events` with no ETL layer:

```sql
CREATE TABLE user_events_kafka
(
    user_id    UInt64,
    item_id    UInt64,
    event_type LowCardinality(String),
    score      Float32,
    ts         DateTime
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'broker:9092',
    kafka_topic_list  = 'user-events',
    kafka_group_name  = 'clickhouse-rec',
    kafka_format      = 'JSONEachRow';
```

A materialized view from `user_events_kafka` INTO `user_events` completes the pipeline.

## Monitoring with OneUptime

Track recommendation query latency and event ingestion lag as custom metrics in [OneUptime](https://oneuptime.com). Alert when p95 query time exceeds your SLA or when Kafka consumer lag grows.

## Summary

ClickHouse materialized views and SummingMergeTree let you build sub-10 ms recommendation queries over hundreds of millions of events. Combine Kafka ingestion with affinity pre-aggregation for a fully real-time recommendation pipeline.
