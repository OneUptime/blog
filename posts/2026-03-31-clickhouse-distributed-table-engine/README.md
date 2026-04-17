# What Is Distributed Table Engine and How It Routes Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Sharding, Cluster, Query Routing

Description: Learn how the ClickHouse Distributed table engine routes queries across shards, how to configure sharding keys, and how to manage distributed writes and reads.

## Introduction

When a single ClickHouse server can no longer handle your data volume or query throughput, you scale horizontally by splitting data across multiple shards. The `Distributed` table engine is the layer that makes a sharded cluster transparent to the query layer.

A `Distributed` table is a virtual table. It does not store any data itself. Instead, it knows the addresses of all shards and, when you query it, it fans the query out to all shards, collects the results, and merges them into a single result set. When you insert into it, it routes each row to the correct shard based on a sharding key.

## How Sharding Works

A ClickHouse cluster has:
- One or more **shards** - each shard holds a distinct subset of the data
- Each shard has one or more **replicas** - copies of the same data for fault tolerance

The `Distributed` engine routes a write to exactly one shard per row. For reads, it sends the query to one replica of each shard (load-balancing across replicas) and merges the results.

```text
[Client]
   |
   v
[Distributed Table: events]   <- virtual, no data
   |
   +---> [Shard 1: Replica 1A, Replica 1B]  <- stores events where cityHash64(user_id) % 3 = 0
   +---> [Shard 2: Replica 2A, Replica 2B]  <- stores events where cityHash64(user_id) % 3 = 1
   +---> [Shard 3: Replica 3A, Replica 3B]  <- stores events where cityHash64(user_id) % 3 = 2
```

## Cluster Configuration

Define the cluster topology in `config.xml` or a file in `config.d/`:

```xml
<remote_servers>
    <my_cluster>
        <shard>
            <weight>1</weight>
            <internal_replication>true</internal_replication>
            <replica>
                <host>ch-01</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-02</host>
                <port>9000</port>
            </replica>
        </shard>
        <shard>
            <weight>1</weight>
            <internal_replication>true</internal_replication>
            <replica>
                <host>ch-03</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-04</host>
                <port>9000</port>
            </replica>
        </shard>
        <shard>
            <weight>1</weight>
            <internal_replication>true</internal_replication>
            <replica>
                <host>ch-05</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-06</host>
                <port>9000</port>
            </replica>
        </shard>
    </my_cluster>
</remote_servers>
```

`internal_replication: true` means the Distributed table delegates replication to `ReplicatedMergeTree`. It only writes to one replica per shard and lets the replicas synchronize. Setting this to `false` makes the Distributed table write to all replicas itself, which is less efficient.

## Creating the Local Tables

First create the actual storage table on every shard node. Use `ReplicatedMergeTree` for fault tolerance:

```sql
-- Run this on all shard nodes (using ON CLUSTER)
CREATE TABLE events_local ON CLUSTER my_cluster
(
    event_id    UUID DEFAULT generateUUIDv4(),
    occurred_at DateTime,
    user_id     String,
    event_type  LowCardinality(String),
    value       Float64
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events_local', '{replica}')
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (user_id, occurred_at);
```

## Creating the Distributed Table

```sql
CREATE TABLE events ON CLUSTER my_cluster
AS events_local
ENGINE = Distributed(
    my_cluster,     -- cluster name from config
    currentDatabase(), -- database name
    events_local,   -- local table name on each shard
    cityHash64(user_id) -- sharding key expression
);
```

The sharding key expression determines which shard a row goes to:

```text
shard_index = sharding_key_value % number_of_shards
```

## Choosing a Sharding Key

The sharding key controls data distribution. A poor sharding key leads to hot shards (uneven data distribution) or expensive cross-shard joins.

**Good sharding keys:**
- A high-cardinality column with uniform distribution, like `user_id`
- A hash of multiple columns if no single column distributes evenly

```sql
-- Single high-cardinality column
ENGINE = Distributed(my_cluster, default, events_local, cityHash64(user_id))

-- Hash of multiple columns
ENGINE = Distributed(my_cluster, default, events_local, cityHash64(user_id, event_type))

-- intHash32 for integer keys
ENGINE = Distributed(my_cluster, default, events_local, intHash32(user_id_int))
```

**Avoid as sharding keys:**
- Low-cardinality columns (like `event_type`) - only a few distinct values means only a few shards get data
- Timestamps alone - if data arrives monotonically, only the latest shard receives writes
- Columns that are never in query filters - you lose co-location benefits

## Inserting Data

Insert through the Distributed table just like a local table:

```sql
INSERT INTO events (occurred_at, user_id, event_type, value)
VALUES
    (now(), 'user-001', 'page_view', 1),
    (now(), 'user-002', 'purchase',  49.99),
    (now(), 'user-003', 'page_view', 1);
```

The Distributed table computes `cityHash64(user_id) % 3` for each row and routes it to the corresponding shard. The routing is local to the receiving node - no data travels over the network for the routing computation itself.

## Querying Data

Query the Distributed table as if it were a regular table:

```sql
SELECT
    event_type,
    count()  AS events,
    sum(value) AS total_value
FROM events
WHERE occurred_at >= now() - INTERVAL 7 DAY
GROUP BY event_type
ORDER BY events DESC;
```

ClickHouse fans this query to all 3 shards. Each shard runs the query locally, and the coordinator node (the one you connected to) merges the partial results.

## Querying System Tables About the Cluster

```sql
-- See all shards and replicas
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    port,
    is_local
FROM system.clusters
WHERE cluster = 'my_cluster'
ORDER BY shard_num, replica_num;
```

```sql
-- Check data distribution across shards
SELECT
    hostName()  AS shard,
    count()     AS rows,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed_size
FROM clusterAllReplicas('my_cluster', system.parts)
WHERE table = 'events_local'
  AND active = 1
GROUP BY shard;
```

## Distributed Aggregation Settings

By default, each shard computes a partial aggregation state and sends those states to the coordinator, which merges them into the final result. For queries where data for each group lives on a single shard (typically when the `GROUP BY` key is the sharding key), the shards can compute the full aggregation independently. Use `distributed_group_by_no_merge` to skip the merge step on the coordinator:

```sql
-- Push down full GROUP BY to each shard (useful when GROUP BY key = sharding key)
SET distributed_group_by_no_merge = 1;

SELECT user_id, count() AS events
FROM events
WHERE occurred_at >= today()
GROUP BY user_id;
```

## Avoiding Cross-Shard JOINs

The most important performance rule for distributed ClickHouse is to keep JOINs on the same node. If you join two tables that are sharded by different keys, all matching rows for each join pair must travel over the network.

Design your sharding strategy so that frequently joined tables use the same sharding key:

```sql
-- Both tables sharded by user_id: JOIN stays local per shard
CREATE TABLE orders_local ... ENGINE = ReplicatedMergeTree(...)
ORDER BY (user_id, created_at);

CREATE TABLE orders ON CLUSTER my_cluster
AS orders_local
ENGINE = Distributed(my_cluster, default, orders_local, cityHash64(user_id));

-- This JOIN can be resolved locally on each shard
SELECT e.user_id, count(DISTINCT e.event_id), count(DISTINCT o.order_id)
FROM events e
JOIN orders o ON e.user_id = o.user_id
WHERE e.occurred_at >= today()
GROUP BY e.user_id;
```

## Distributed Writes and the Insert Buffer

When inserting directly into a Distributed table, ClickHouse buffers rows in-memory or on-disk before forwarding them to shards. Configure the buffer behavior:

```sql
-- Minimum sleep time (ms) between background flushes of pending inserts to shards
-- (older name: distributed_directory_monitor_sleep_time_ms)
SET distributed_background_insert_sleep_time_ms = 100;

-- Batch multiple pending files into a single INSERT to each shard
SET distributed_background_insert_batch = 1;
```

For very high insert rates, insert directly into the local table on each shard and bypass the Distributed layer's network hop.

## Conclusion

The Distributed table engine is the query routing layer that makes a sharded ClickHouse cluster transparent to applications. It fans queries out to all shards and merges results, and routes inserts to the appropriate shard based on the sharding key. Choosing the right sharding key and co-locating data that is frequently joined together are the most important design decisions when building a distributed ClickHouse deployment.

**Related Reading:**

- [What Is the Difference Between ReplicatedMergeTree and MergeTree](https://oneuptime.com/blog/post/2026-03-31-clickhouse-replicated-vs-mergetree/view)
- [What Is ClickHouse Keeper and Why You Need It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-keeper-explained/view)
- [How to Use ClickHouse Cloud vs Self-Hosted ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-cloud-vs-self-hosted/view)
