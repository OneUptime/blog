# How to Use ReplicatedMergeTree Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedMergeTree, Replication, High Availability, Distributed

Description: Learn how to use the ReplicatedMergeTree engine in ClickHouse to build fault-tolerant, replicated tables across multiple nodes.

---

ReplicatedMergeTree is the foundation for data replication in ClickHouse. It extends MergeTree with automatic data synchronization between replicas using ClickHouse Keeper (or ZooKeeper). When you insert data into one replica, it is automatically propagated to all others, enabling high availability and fault tolerance.

## Prerequisites

You need ClickHouse Keeper or ZooKeeper running and configured in your ClickHouse cluster. For modern deployments, ClickHouse Keeper is preferred as it is bundled with ClickHouse.

```xml
<!-- config.xml snippet -->
<zookeeper>
    <node>
        <host>keeper1.example.com</host>
        <port>9181</port>
    </node>
</zookeeper>
```

## Creating a Replicated Table

```sql
CREATE TABLE events ON CLUSTER my_cluster (
    event_id UInt64,
    event_type String,
    ts DateTime,
    user_id UInt32
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, ts);
```

- The first argument is the ZooKeeper path. Use `{shard}` macro to differentiate shards.
- The second argument is the replica name. Use `{replica}` macro defined in macros config.

## Macros Configuration

Define `{shard}` and `{replica}` in each server's config:

```xml
<!-- macros.xml on shard 1, replica 1 -->
<macros>
    <shard>01</shard>
    <replica>replica1</replica>
</macros>
```

## Inserting Data

Insert data to any replica - ClickHouse handles propagation:

```sql
INSERT INTO events VALUES
(1, 'page_view', now(), 42),
(2, 'click', now(), 43);
```

You can verify replication lag:

```sql
SELECT
    database,
    table,
    replica_name,
    queue_size,
    inserts_in_queue,
    absolute_delay
FROM system.replicas
WHERE table = 'events';
```

## Monitoring Replication

Use system tables to monitor replication health:

```sql
-- Check replication queue
SELECT *
FROM system.replication_queue
WHERE table = 'events'
ORDER BY create_time DESC
LIMIT 20;

-- Check for errors
SELECT *
FROM system.replicas
WHERE last_queue_update_exception != ''
  AND table = 'events';
```

## Handling Replica Recovery

If a replica falls behind, ClickHouse will catch it up automatically when it reconnects. You can wait for a replica to finish catching up:

```sql
SYSTEM SYNC REPLICA events;
```

## Deduplication

ReplicatedMergeTree provides idempotent inserts using block checksums. If you retry an insert with the same block, ClickHouse deduplicates it automatically:

```sql
-- Deduplication is enabled by default; you can toggle it per-insert:
SET insert_deduplicate = 1;

-- The deduplication window (default 100 blocks) is a table-level setting:
-- replicated_deduplication_window = 100
```

## Summary

ReplicatedMergeTree is the go-to engine for production ClickHouse deployments that require high availability. It handles data synchronization transparently via ClickHouse Keeper, supports automatic recovery from replica failures, and provides insert deduplication. Always use the `{shard}` and `{replica}` macros in the ZooKeeper path to keep configurations portable across your cluster nodes.
