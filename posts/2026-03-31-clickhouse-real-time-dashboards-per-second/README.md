# How to Build Real-Time Dashboards Updating Every Second with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dashboard, Real-Time, Streaming, Performance

Description: Build sub-second updating dashboards with ClickHouse by combining fast aggregation queries, materialized views, and WebSocket push to deliver live metrics at 1-second refresh rates.

---

Building dashboards that update every second requires both fast data ingestion and fast query execution. ClickHouse excels at both: it can ingest millions of events per second and answer aggregation queries over fresh data in under 100 milliseconds. This guide shows how to build a 1-second dashboard without overwhelming your cluster.

## Designing for 1-Second Refresh

The key insight: not all panels need to query raw data every second. Pre-aggregate into "hot" tables for the most recent window and query those. Panels showing historical trends can query at 10-30 second intervals without users noticing.

## Hot Aggregation Table

Maintain a rolling 5-minute window of pre-aggregated metrics:

```sql
CREATE TABLE realtime_metrics (
    ts DateTime,
    metric_name LowCardinality(String),
    value Float64,
    tag String DEFAULT ''
) ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY (metric_name, ts)
TTL ts + INTERVAL 1 HOUR;
```

Populate it via a materialized view:

```sql
CREATE MATERIALIZED VIEW realtime_metrics_mv
TO realtime_metrics
AS
SELECT
    toStartOfSecond(event_time) AS ts,
    'active_users' AS metric_name,
    uniqExact(user_id) AS value
FROM events
GROUP BY ts;
```

## Efficient Last-N-Seconds Query

For a "last 60 seconds" panel:

```sql
SELECT
    ts,
    value
FROM realtime_metrics
WHERE metric_name = 'active_users'
    AND ts >= now() - INTERVAL 60 SECOND
ORDER BY ts ASC;
```

This query typically runs in under 5 milliseconds because it's a narrow time-range scan of a small dataset.

## Events Per Second Counter

```sql
SELECT
    toStartOfSecond(event_time) AS second,
    count() AS events,
    uniqExact(user_id) AS unique_users
FROM events
WHERE event_time >= now() - INTERVAL 30 SECOND
GROUP BY second
ORDER BY second;
```

## Current Value Panels (Single Number)

For KPI panels showing a single current value:

```sql
-- Active users right now (last 30 seconds)
SELECT uniqExact(user_id)
FROM events
WHERE event_time >= now() - INTERVAL 30 SECOND;

-- Events per second (last 10 seconds average)
SELECT count() / 10.0
FROM events
WHERE event_time >= now() - INTERVAL 10 SECOND;
```

These typically run in under 20 milliseconds on warm data.

## WebSocket Push Server

For truly real-time dashboards, push data to the browser via WebSocket instead of polling:

```python
import asyncio
import websockets
import json
import clickhouse_connect

ch = clickhouse_connect.get_client(host='clickhouse.internal', port=8443, secure=True)

async def stream_metrics(websocket):
    while True:
        result = ch.query('''
            SELECT
                toStartOfSecond(event_time) AS second,
                count() AS events,
                uniqExact(user_id) AS users
            FROM events
            WHERE event_time >= now() - INTERVAL 60 SECOND
            GROUP BY second
            ORDER BY second
        ''')
        await websocket.send(json.dumps(list(result.named_results()), default=str))
        await asyncio.sleep(1)

async def main():
    async with websockets.serve(stream_metrics, '0.0.0.0', 8765):
        await asyncio.Future()  # Run forever

asyncio.run(main())
```

## Caching Strategy

Protect ClickHouse from dashboard stampedes (many users opening the same dashboard simultaneously):

```python
import redis
import json

cache = redis.Redis()

def get_dashboard_data(panel_id: str) -> dict:
    cached = cache.get(f'dashboard:{panel_id}')
    if cached:
        return json.loads(cached)

    data = query_clickhouse(panel_id)
    cache.setex(f'dashboard:{panel_id}', 1, json.dumps(data))  # 1-second TTL
    return data
```

This ensures at most one ClickHouse query per second per panel, regardless of how many users are viewing the dashboard.

## Grafana Real-Time Setup

In Grafana, configure the panel refresh interval:

```text
Dashboard settings -> Auto refresh: 1s
Panel query: use variable $__to - $__from = 60s window
Min interval: 1s
```

Use the ClickHouse Grafana plugin which supports streaming queries and efficient time-range filtering.

## Summary

Building 1-second updating dashboards with ClickHouse requires materialized views to pre-aggregate into hot tables, narrow time-range queries that execute in under 50 milliseconds, WebSocket push for truly real-time delivery, and a 1-second Redis cache to prevent query storms when many users view the same dashboard simultaneously.
