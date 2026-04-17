# How to Configure Distributed Tables in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Table, Sharding, Cluster, Query Routing, Performance

Description: Learn how to configure Distributed tables in ClickHouse to route queries and inserts across shards in a multi-node cluster.

---

The `Distributed` table engine in ClickHouse acts as a proxy layer over local tables on individual shards. It routes `SELECT` queries to all shards and merges results, and routes `INSERT` statements to shards based on a sharding key.

## Prerequisites

You need a running ClickHouse cluster defined in `config.xml` with at least two shards, and a local `MergeTree` (or `ReplicatedMergeTree`) table on each node.

## Create the Local Table on Each Shard

```sql
CREATE TABLE events_local ON CLUSTER my_cluster (
    event_time DateTime,
    user_id    UInt64,
    event_type String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);
```

## Create the Distributed Table

```sql
CREATE TABLE events ON CLUSTER my_cluster (
    event_time DateTime,
    user_id    UInt64,
    event_type String
) ENGINE = Distributed(
    'my_cluster',       -- cluster name from config
    'default',          -- database
    'events_local',     -- local table name
    intHash64(user_id)  -- sharding key expression
);
```

The sharding key expression determines which shard each row goes to. `intHash64(user_id)` distributes rows evenly across shards by user.

## Insert Data via the Distributed Table

```sql
INSERT INTO events VALUES (now(), 1001, 'pageview');
INSERT INTO events VALUES (now(), 1002, 'click');
```

ClickHouse hashes the `user_id` and routes each row to the appropriate shard asynchronously by default.

## Synchronous Distributed Inserts

By default, the Distributed engine buffers inserts and sends them asynchronously. Use `distributed_foreground_insert` for synchronous delivery:

```sql
SET distributed_foreground_insert = 1;
INSERT INTO events VALUES (now(), 1003, 'purchase');
```

## Query the Distributed Table

```sql
-- Fans out to all shards, merges results
SELECT event_type, count()
FROM events
WHERE event_time >= today()
GROUP BY event_type
ORDER BY count() DESC;
```

## Inspect Pending Distributed Sends

```sql
SELECT *
FROM system.distribution_queue
WHERE table = 'events'
ORDER BY data_files DESC;
```

## Tune Distributed Table Settings

```xml
<distributed_background_insert_sleep_time_ms>500</distributed_background_insert_sleep_time_ms>
<distributed_background_insert_max_sleep_time_ms>5000</distributed_background_insert_max_sleep_time_ms>
```

Reduce sleep time if you need lower insert-to-shard latency.

## Summary

Distributed tables in ClickHouse are a thin routing layer over local shard tables. Choose a sharding key that distributes data evenly and matches your most common filter patterns to enable shard pruning. Use `distributed_foreground_insert` for strong consistency, or leave async mode enabled for higher insert throughput.
