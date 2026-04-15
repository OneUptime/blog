# What Is the Difference Between ReplicatedMergeTree and MergeTree

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedMergeTree, MergeTree, Replication, High Availability

Description: Understand the difference between MergeTree and ReplicatedMergeTree in ClickHouse, including how replication works, when to use each, and how to set up replicas.

## Introduction

`MergeTree` is ClickHouse's base storage engine for analytical workloads. `ReplicatedMergeTree` is its replicated counterpart that provides high availability and fault tolerance by maintaining synchronized copies of the same data across multiple servers.

Choosing between them comes down to a simple question: does your workload require fault tolerance and zero-downtime maintenance? If yes, use `ReplicatedMergeTree`. If you are running on a single server without HA requirements, `MergeTree` is simpler and has no coordination overhead.

## MergeTree: Single-Node Storage

`MergeTree` stores data on one server. It has no awareness of other servers. All reads and writes go to the same machine.

```sql
CREATE TABLE events
(
    event_id    UUID,
    occurred_at DateTime,
    user_id     String,
    event_type  LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (user_id, occurred_at);
```

**Pros:**
- No external dependencies (no ZooKeeper or ClickHouse Keeper required)
- Simpler setup and operations
- Slightly lower write latency (no coordination needed)

**Cons:**
- No automatic failover
- No replica to read from during maintenance
- Data is lost if the server disk fails without external backups

## ReplicatedMergeTree: Replicated Storage

`ReplicatedMergeTree` keeps the same data on two or more servers. Replicas stay in sync through a coordination service: historically Apache ZooKeeper, now more commonly ClickHouse Keeper (the built-in alternative).

```sql
CREATE TABLE events
(
    event_id    UUID,
    occurred_at DateTime,
    user_id     String,
    event_type  LowCardinality(String)
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (user_id, occurred_at);
```

The two string parameters are:
- **ZooKeeper path** (`/clickhouse/tables/{shard}/events`) - a unique path in Keeper that all replicas of this table share
- **Replica name** (`{replica}`) - a unique identifier for this specific replica

The macros `{shard}` and `{replica}` are substituted from the server's `config.xml` or `macros.xml` configuration file:

```xml
<macros>
    <shard>01</shard>
    <replica>replica-01</replica>
</macros>
```

## How Replication Works

When you insert data into a `ReplicatedMergeTree` table:

1. The receiving server writes the new data part to its local disk
2. It registers the insert in ClickHouse Keeper (or ZooKeeper) as a replication log entry
3. Other replicas detect the new log entry and pull the data part from the source replica using HTTP
4. Each replica writes the part to its own local disk and confirms completion in Keeper

This is an **asynchronous pull-based** replication model. Replicas fetch data from each other rather than having a primary push to all replicas.

```text
[Client] ---INSERT---> [Replica 1]
                            |
                            v
                     [ClickHouse Keeper]
                            |
                      (log entry)
                            |
                            v
                       [Replica 2] ---HTTP fetch---> [Replica 1]
                       [Replica 3] ---HTTP fetch---> [Replica 1]
```

## Checking Replication Status

```sql
-- Check replication queue (pending log entries)
SELECT
    database,
    table,
    type,
    is_currently_executing,
    num_tries,
    last_exception
FROM system.replication_queue
ORDER BY create_time;
```

```sql
-- Check replica health and lag
SELECT
    database,
    table,
    replica_name,
    is_leader,
    is_readonly,
    absolute_delay,        -- how many seconds behind the leader
    queue_size             -- pending replication tasks
FROM system.replicas
ORDER BY absolute_delay DESC;
```

If `absolute_delay` is large, a replica is falling behind. This can happen due to network issues, disk pressure, or the replica being restarted.

## Replication vs Sharding

Replication and sharding solve different problems:
- **Replication** - multiple copies of the same data for fault tolerance and read scaling
- **Sharding** - splitting data across nodes so each node holds a subset, enabling horizontal write scaling

In a production cluster, you typically combine both: multiple shards each with multiple replicas.

```text
Shard 1: Replica 1A, Replica 1B
Shard 2: Replica 2A, Replica 2B
Shard 3: Replica 3A, Replica 3B
```

The `Distributed` table engine routes queries across shards while each shard's `ReplicatedMergeTree` handles the replica synchronization.

## All ReplicatedMergeTree Variants

Every `MergeTree` variant has a `Replicated` counterpart:

```text
MergeTree                 -> ReplicatedMergeTree
ReplacingMergeTree        -> ReplicatedReplacingMergeTree
SummingMergeTree          -> ReplicatedSummingMergeTree
AggregatingMergeTree      -> ReplicatedAggregatingMergeTree
CollapsingMergeTree       -> ReplicatedCollapsingMergeTree
VersionedCollapsingMergeTree -> ReplicatedVersionedCollapsingMergeTree
GraphiteMergeTree         -> ReplicatedGraphiteMergeTree
```

The behavior of the variant (deduplication, aggregation, collapsing) is preserved across replicas.

## Creating a Replicated Table Pair

On server 1 (replica-01):

```sql
CREATE TABLE page_views ON CLUSTER my_cluster
(
    view_id     UUID DEFAULT generateUUIDv4(),
    occurred_at DateTime,
    page        LowCardinality(String),
    user_id     String
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/page_views', '{replica}')
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (page, occurred_at);
```

Using `ON CLUSTER my_cluster` creates the table on all nodes in the cluster in a single statement. Replicas with the same shard macro will form a replication group.

## Inserts and Consistency

By default, a `ReplicatedMergeTree` insert is acknowledged as soon as one replica writes the data. Other replicas catch up asynchronously. You can increase write durability by requiring more replicas to confirm:

```sql
-- Wait for 2 replicas to confirm the write
SET insert_quorum = 2;
SET insert_quorum_timeout = 10000;

INSERT INTO page_views (occurred_at, page, user_id)
VALUES (now(), '/docs', 'u-1001');
```

For reads, you can enforce reading from a replica that has caught up to the inserted data:

```sql
SET select_sequential_consistency = 1;
SELECT count() FROM page_views WHERE user_id = 'u-1001';
```

## Converting MergeTree to ReplicatedMergeTree

You cannot change a table's engine in place. The procedure is:

```bash
# 1. Create the new replicated table
# 2. Copy data from the old table
# 3. Rename tables
# 4. Drop the old table
```

```sql
CREATE TABLE page_views_replicated
(
    view_id     UUID,
    occurred_at DateTime,
    page        LowCardinality(String),
    user_id     String
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/01/page_views', 'replica-01')
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (page, occurred_at);

INSERT INTO page_views_replicated SELECT * FROM page_views;

RENAME TABLE page_views TO page_views_old, page_views_replicated TO page_views;
DROP TABLE page_views_old;
```

## When to Use Each

| Situation | Recommended Engine |
|---|---|
| Development or testing | MergeTree |
| Single server, no HA needed | MergeTree |
| Production workload requiring uptime | ReplicatedMergeTree |
| Zero-downtime rolling upgrades | ReplicatedMergeTree |
| Read scaling across replicas | ReplicatedMergeTree |
| Multi-shard cluster | ReplicatedMergeTree |

## Conclusion

`MergeTree` is simpler and sufficient for single-node deployments. `ReplicatedMergeTree` adds high availability, fault tolerance, and read scalability through asynchronous pull-based replication coordinated by ClickHouse Keeper. In production, most serious deployments use `ReplicatedMergeTree` paired with a `Distributed` table on top for automatic query routing across shards and replicas.

**Related Reading:**

- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
- [What Is ClickHouse Keeper and Why You Need It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-keeper-explained/view)
- [What Is Distributed Table Engine and How It Routes Queries](https://oneuptime.com/blog/post/2026-03-31-clickhouse-distributed-table-engine/view)
