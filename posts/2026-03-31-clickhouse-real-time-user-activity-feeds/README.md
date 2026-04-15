# How to Build Real-Time User Activity Feeds with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Activity Feed, Real-Time Analytics, Social, Analytics

Description: Store and query user activity events in ClickHouse to power real-time activity feeds with low-latency reads over large event histories.

---

Activity feeds show what users have done recently - likes, comments, follows, and posts. As datasets grow to billions of events, traditional databases struggle. ClickHouse queries that data in milliseconds.

## Events Table

```sql
CREATE TABLE activity_events
(
    actor_id    UInt64,
    target_id   UInt64,
    object_id   UInt64,
    verb        LowCardinality(String),  -- 'like', 'comment', 'follow', 'post'
    metadata    String,                  -- JSON payload
    ts          DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (actor_id, ts);
```

## Personal Activity Feed

Retrieve the 50 most recent events for a user:

```sql
SELECT
    actor_id,
    verb,
    object_id,
    metadata,
    ts
FROM activity_events
WHERE actor_id = 1001
ORDER BY ts DESC
LIMIT 50;
```

The sparse primary index on `(actor_id, ts)` lets ClickHouse skip irrelevant granules efficiently, so this returns in single-digit milliseconds even across all partitions.

## Follower Feed (Social Graph)

Assume you have a small follower list. Pass it as an array:

```sql
SELECT
    actor_id,
    verb,
    object_id,
    ts
FROM activity_events
WHERE actor_id IN (201, 305, 418, 522)
  AND ts >= now() - INTERVAL 7 DAY
ORDER BY ts DESC
LIMIT 100;
```

## Activity Counts by Verb

```sql
SELECT
    verb,
    count() AS event_count,
    uniq(actor_id) AS unique_actors
FROM activity_events
WHERE ts >= today()
GROUP BY verb
ORDER BY event_count DESC;
```

## Trending Objects

Find the most-liked objects in the past hour:

```sql
SELECT
    object_id,
    count() AS likes
FROM activity_events
WHERE verb = 'like'
  AND ts >= now() - INTERVAL 1 HOUR
GROUP BY object_id
ORDER BY likes DESC
LIMIT 10;
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to track feed query latency. If p99 exceeds 50 ms, inspect partition pruning and ensure the ORDER BY key aligns with your most common WHERE filters.

## Summary

ClickHouse's columnar storage and partition pruning make it ideal for activity feeds. A simple MergeTree table ordered by `(actor_id, ts)` delivers fast personal feed reads, and arbitrary aggregations over the full event history cost very little at query time.
