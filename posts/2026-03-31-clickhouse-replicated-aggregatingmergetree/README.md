# How to Use ReplicatedAggregatingMergeTree Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedAggregatingMergeTree, Replication, Aggregation, Storage Engine

Description: Learn how to use ReplicatedAggregatingMergeTree in ClickHouse to store incremental aggregate states across replicated nodes for fault-tolerant pre-aggregation pipelines.

---

`ReplicatedAggregatingMergeTree` combines the `AggregatingMergeTree` engine with ClickHouse's built-in replication system (via ZooKeeper or ClickHouse Keeper). It stores partial aggregate states using `AggregateFunction` column types, merges them during background operations, and replicates all data and merge operations across configured replicas. Use it when you need both pre-aggregation (to avoid scanning raw data repeatedly) and high availability (to survive node failures).

## Prerequisites: ZooKeeper or ClickHouse Keeper

Replicated engines require a coordination service. The `{shard}` and `{replica}` macros are defined in the server config.

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml on replica 1 -->
<clickhouse>
  <macros>
    <shard>01</shard>
    <replica>replica-01</replica>
  </macros>
</clickhouse>
```

## Creating a ReplicatedAggregatingMergeTree Table

```sql
-- Run on each replica (macros substitute {shard} and {replica} automatically)
CREATE TABLE hourly_user_stats
(
    event_hour        DateTime,
    event_type        LowCardinality(String),
    country           LowCardinality(String),
    event_count       AggregateFunction(count),
    unique_users      AggregateFunction(uniq, UInt64),
    total_duration_ms AggregateFunction(sum, UInt64),
    p95_duration_ms   AggregateFunction(quantile(0.95), UInt32)
)
ENGINE = ReplicatedAggregatingMergeTree(
    '/clickhouse/tables/{shard}/hourly_user_stats',  -- ZooKeeper path
    '{replica}'                                       -- replica name
)
PARTITION BY toYYYYMM(event_hour)
ORDER BY (event_hour, event_type, country);
```

## Inserting Aggregate States

You must use `*State` combinators when inserting into `AggregateFunction` columns.

```sql
INSERT INTO hourly_user_stats
SELECT
    toStartOfHour(event_time)  AS event_hour,
    event_type,
    country,
    countState()               AS event_count,
    uniqState(user_id)         AS unique_users,
    sumState(toUInt64(duration_ms))  AS total_duration_ms,
    quantileState(0.95)(duration_ms) AS p95_duration_ms
FROM raw_events
WHERE event_time >= toStartOfHour(now() - INTERVAL 1 HOUR)
  AND event_time <  toStartOfHour(now())
GROUP BY event_hour, event_type, country;
```

## Querying With *Merge Combinators

When reading, use `*Merge` combinators to finalize the aggregation.

```sql
SELECT
    event_hour,
    event_type,
    country,
    countMerge(event_count)              AS events,
    uniqMerge(unique_users)              AS users,
    sumMerge(total_duration_ms)          AS total_ms,
    quantileMerge(0.95)(p95_duration_ms) AS p95_ms
FROM hourly_user_stats
WHERE event_hour >= now() - INTERVAL 24 HOUR
GROUP BY event_hour, event_type, country
ORDER BY event_hour DESC, events DESC;
```

## Using a Materialized View as the Feeder

The typical pattern feeds raw events through a materialized view into the replicated aggregate table.

```sql
-- Raw ingestion table (Null engine - stores nothing)
CREATE TABLE raw_events_null
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    country     LowCardinality(String),
    duration_ms UInt32
)
ENGINE = Null;

-- Materialized view writes aggregate states into the replicated table
CREATE MATERIALIZED VIEW mv_hourly_stats
TO hourly_user_stats
AS
SELECT
    toStartOfHour(event_time)        AS event_hour,
    event_type,
    country,
    countState()                     AS event_count,
    uniqState(user_id)               AS unique_users,
    sumState(toUInt64(duration_ms))  AS total_duration_ms,
    quantileState(0.95)(duration_ms) AS p95_duration_ms
FROM raw_events_null
GROUP BY event_hour, event_type, country;
```

## Checking Replication Status

```sql
-- Verify replication health for the table
SELECT
    database,
    table,
    replica_name,
    replica_path,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size
FROM system.replicas
WHERE table = 'hourly_user_stats';
```

```text
database  table               replica_name  replica_path                                           is_leader  is_readonly  absolute_delay  queue_size
default   hourly_user_stats   replica-01    /clickhouse/tables/01/hourly_user_stats/replicas/...    1          0            0               0
default   hourly_user_stats   replica-02    /clickhouse/tables/01/hourly_user_stats/replicas/...    0          0            0               0
```

## Forcing a Merge of Partial States

Background merges happen automatically, but you can trigger one manually.

```sql
-- Merge all parts for the current month's partition
OPTIMIZE TABLE hourly_user_stats PARTITION '202406' FINAL;
```

After `OPTIMIZE ... FINAL`, each unique `(event_hour, event_type, country)` combination has a single merged row.

## Querying a Specific Replica

To read from a specific replica, connect directly to that node and query the local replicated table. The `prefer_localhost_replica` setting only affects queries through a Distributed table.

```sql
-- Connect to a specific node and query its local replicated table directly
SELECT countMerge(event_count) AS total_events
FROM hourly_user_stats;
```

## Replication Lag Monitoring

```sql
SELECT
    replica_name,
    absolute_delay AS lag_seconds,
    queue_size,
    last_queue_update
FROM system.replicas
WHERE table = 'hourly_user_stats'
ORDER BY absolute_delay DESC;
```

## Combining With a Distributed Table

To query across shards, wrap the replicated table in a Distributed engine.

```sql
CREATE TABLE hourly_user_stats_dist
AS hourly_user_stats
ENGINE = Distributed(
    analytics_cluster,
    default,
    hourly_user_stats,
    cityHash64(event_type)
);

-- Cross-shard aggregated query
SELECT
    event_type,
    countMerge(event_count)  AS events,
    uniqMerge(unique_users)  AS users
FROM hourly_user_stats_dist
WHERE event_hour >= today()
GROUP BY event_type
ORDER BY events DESC;
```

## Limitations

- Requires ZooKeeper or ClickHouse Keeper for coordination.
- Inserts must use `*State` combinators - raw values cannot be inserted directly.
- Reads must use `*Merge` combinators to finalize aggregates.
- Schema changes (ALTER TABLE) are replicated through ZooKeeper/Keeper, but all replicas must be running to apply them consistently.

## Summary

`ReplicatedAggregatingMergeTree` provides fault-tolerant pre-aggregation by combining aggregate state storage with automatic replication. It is the production-grade engine for summary tables that must remain available even when a replica goes offline. Pair it with a Null-engine feeder table and materialized views for a zero-data-loss streaming aggregation pipeline.
