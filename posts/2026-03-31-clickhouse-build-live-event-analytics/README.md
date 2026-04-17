# How to Build Live Event Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Live Event, Real-Time, Concurrency, Streaming Analytics

Description: Learn how to track concurrent viewers, real-time engagement spikes, and live event funnel metrics in ClickHouse with sub-second latency.

---

Live events - concerts, sports streams, webinars, and auctions - generate intense bursts of user activity that require real-time visibility. ClickHouse ingests thousands of events per second and can answer "how many people are watching right now?" within milliseconds, making it ideal for live event operations dashboards.

## Schema

```sql
CREATE TABLE live_event_actions
(
    event_id     UInt64,
    user_id      UInt64,
    session_id   UUID,
    action_type  LowCardinality(String), -- 'join','leave','react','chat','purchase'
    ts           DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (event_id, ts);
```

## Concurrent Viewers at Any Point in Time

Track simultaneous active sessions using join/leave events:

```sql
SELECT
    minute,
    sum(net_change) OVER (ORDER BY minute) AS concurrent_viewers
FROM (
    SELECT
        toStartOfMinute(ts) AS minute,
        countIf(action_type = 'join') - countIf(action_type = 'leave') AS net_change
    FROM live_event_actions
    WHERE event_id = 101
      AND ts BETWEEN '2026-03-31 18:00:00' AND '2026-03-31 21:00:00'
    GROUP BY minute
)
ORDER BY minute;
```

## Reaction Spike Detection

Find moments of peak engagement:

```sql
SELECT
    toStartOfSecond(ts) AS second,
    countIf(action_type = 'react') AS reactions
FROM live_event_actions
WHERE event_id = 101
GROUP BY second
ORDER BY reactions DESC
LIMIT 10;
```

## Chat Activity Heatmap

```sql
SELECT
    toStartOfMinute(ts) AS minute,
    count() AS chat_messages
FROM live_event_actions
WHERE event_id = 101
  AND action_type = 'chat'
GROUP BY minute
ORDER BY minute;
```

## Purchase Conversion Rate During Live Event

```sql
SELECT
    toStartOfMinute(ts) AS minute,
    countIf(action_type = 'purchase') AS purchases,
    uniqExact(session_id) AS active_sessions,
    countIf(action_type = 'purchase') * 100.0 / uniqExact(session_id) AS conversion_pct
FROM live_event_actions
WHERE event_id = 101
GROUP BY minute
ORDER BY minute;
```

## Drop-off Funnel

How many users perform each action after joining?

```sql
SELECT
    action_type,
    uniqExact(user_id) AS users
FROM live_event_actions
WHERE event_id = 101
  AND user_id IN (
      SELECT user_id FROM live_event_actions
      WHERE event_id = 101 AND action_type = 'join'
  )
GROUP BY action_type
ORDER BY users DESC;
```

## Real-Time Active Viewer Count

This query can power a live counter refreshing every few seconds:

```sql
SELECT uniqExact(session_id) AS active_viewers
FROM live_event_actions
WHERE event_id = 101
  AND action_type = 'join'
  AND session_id NOT IN (
      SELECT session_id FROM live_event_actions
      WHERE event_id = 101 AND action_type = 'leave'
  );
```

## Summary

ClickHouse enables real-time live event analytics by combining high-throughput ingestion with instant aggregation queries. Model join and leave events to track concurrent viewers, detect engagement spikes per second, and compute conversion rates during live purchases - all with millisecond query latency even during peak traffic bursts.
