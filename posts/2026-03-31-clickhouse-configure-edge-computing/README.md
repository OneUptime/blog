# How to Configure ClickHouse for Edge Computing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Edge Computing, IoT, Deployment, Architecture

Description: Deploy lightweight ClickHouse instances at the edge to process IoT and sensor data locally, then replicate aggregated results to a central cloud cluster.

---

Edge computing reduces latency and bandwidth by processing data close to its source. ClickHouse runs on modest hardware and can act as an edge analytics node that aggregates data locally before syncing to a central cluster.

## Minimal Edge Node Configuration

A single ClickHouse node with constrained resources:

```xml
<clickhouse>
    <max_server_memory_usage>2000000000</max_server_memory_usage>  <!-- 2 GB -->
    <max_concurrent_queries>10</max_concurrent_queries>
    <background_pool_size>2</background_pool_size>
    <background_move_pool_size>1</background_move_pool_size>
</clickhouse>
```

## Edge Table for Sensor Data

```sql
CREATE TABLE sensor_readings
(
    device_id  LowCardinality(String),
    metric     LowCardinality(String),
    value      Float32,
    ts         DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (device_id, metric, ts)
TTL ts + INTERVAL 7 DAY;  -- keep only 7 days locally
```

## Local Aggregation Before Syncing

Pre-aggregate on the edge to reduce the sync payload:

```sql
CREATE MATERIALIZED VIEW sensor_hourly_mv
ENGINE = AggregatingMergeTree()
ORDER BY (device_id, metric, hour)
AS
SELECT
    device_id,
    metric,
    toStartOfHour(ts) AS hour,
    avgState(value) AS avg_value,
    minState(value) AS min_value,
    maxState(value) AS max_value,
    countState() AS sample_count
FROM sensor_readings
GROUP BY device_id, metric, hour;
```

`SummingMergeTree` only sums numeric columns during merges, which would corrupt `avg`/`min`/`max`. `AggregatingMergeTree` with `-State` combinators stores partial states that merge correctly; query them with the matching `-Merge` functions.

## Syncing to Central Cluster

Use the `remote()` table function to push hourly aggregates to the central cluster:

```bash
clickhouse-client --query "
INSERT INTO FUNCTION remote('central-ch:9000', 'prod.sensor_hourly', 'sync_user', 'pass')
SELECT
    device_id,
    metric,
    hour,
    avgMerge(avg_value)   AS avg_value,
    minMerge(min_value)   AS min_value,
    maxMerge(max_value)   AS max_value,
    countMerge(sample_count) AS sample_count
FROM sensor_hourly_mv
WHERE hour = toStartOfHour(now() - INTERVAL 1 HOUR)
GROUP BY device_id, metric, hour
"
```

Run this as a cron job every hour.

## Handling Intermittent Connectivity

The `Buffer` engine only flushes to a *local* destination table, so it can't queue writes for an unreachable remote cluster. For that, use a `Distributed` engine: when the remote shard is down, ClickHouse spools inserts to disk under `<path>/distributed/` and retries automatically. After defining the `central_cluster` in `remote_servers`:

```sql
CREATE TABLE sensor_hourly_dist
(
    device_id    LowCardinality(String),
    metric       LowCardinality(String),
    hour         DateTime,
    avg_value    Float64,
    min_value    Float32,
    max_value    Float32,
    sample_count UInt64
)
ENGINE = Distributed('central_cluster', 'prod', 'sensor_hourly', rand());
```

Inserts into `sensor_hourly_dist` are durable on the edge node's disk until the central cluster is reachable.

## Monitoring Edge Nodes

Register each edge node as a monitored service in [OneUptime](https://oneuptime.com). Alert when an edge node hasn't synced in more than 2 hours, which indicates a connectivity problem.

## Summary

ClickHouse at the edge runs on 2-4 GB of RAM, aggregates locally with a TTL to manage disk, and syncs compact hourly summaries to a central cluster. This pattern dramatically reduces bandwidth while retaining full analytical capability at the center.
