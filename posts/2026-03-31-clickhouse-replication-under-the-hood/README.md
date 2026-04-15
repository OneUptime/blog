# How ClickHouse Handles Replication Under the Hood

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, ReplicatedMergeTree, ClickHouse Keeper, ZooKeeper

Description: Explains the mechanics of ClickHouse replication using ReplicatedMergeTree and ClickHouse Keeper, including part log, replica queue, and how replication ensures consistency.

---

## Replication Overview

ClickHouse replication is built into the MergeTree engine family as `ReplicatedMergeTree`. Unlike PostgreSQL streaming replication which sends WAL bytes, ClickHouse replication is part-based: replicas coordinate which data parts to download from each other.

## Core Components

```text
Component              | Role
-----------------------|--------------------------------------------------
ReplicatedMergeTree    | Table engine with built-in replication logic
ClickHouse Keeper      | Distributed consensus for replica coordination
  (or ZooKeeper)
Replication log        | Shared log of operations stored in Keeper
Replica queue          | Per-replica queue of pending operations
Fetch from replica     | Replicas download parts from each other via HTTP
```

## Table Creation

```sql
-- Each replica has the same CREATE TABLE with different {replica} macro
CREATE TABLE events (
  event_id   UInt64,
  user_id    UInt64,
  event_time DateTime
) ENGINE = ReplicatedMergeTree(
  '/clickhouse/tables/{shard}/events',  -- Keeper path (same for all replicas in shard)
  '{replica}'                           -- Unique per server
)
ORDER BY (user_id, event_time);
```

## How Inserts Propagate

```text
1. Client inserts data into replica-1
2. replica-1 writes the part locally
3. replica-1 logs the part creation in Keeper replication log
4. replica-2 reads the replication log entry
5. replica-2 downloads the part from replica-1 via HTTP
6. replica-2 applies the part locally
```

The source replica for each fetch is visible in `system.replication_queue`.

## Monitoring Replication

```sql
-- Check replica status and lag
SELECT
  database,
  table,
  replica_name,
  is_leader,
  is_readonly,
  queue_size,
  inserts_in_queue,
  merges_in_queue,
  log_pointer,
  log_max_index,
  log_max_index - log_pointer AS replication_lag
FROM system.replicas
ORDER BY replication_lag DESC;

-- Check what's in the replica queue
SELECT type, new_part_name, create_time, num_tries
FROM system.replication_queue
WHERE database = 'analytics' AND table = 'events'
ORDER BY create_time
LIMIT 20;
```

## Merges Are Coordinated, Not Duplicated

When a background merge needs to run, the leader replica schedules it by writing a merge entry to the replication log in Keeper. Each replica then independently either:
- Executes the merge locally from its own source parts
- Downloads the already-merged part from another replica that completed the merge first

This coordination prevents conflicting merge decisions across replicas.

```sql
-- See which replica is the leader
SELECT database, table, replica_name, is_leader
FROM system.replicas
WHERE table = 'events';
```

## Handling Replica Failures

If a replica falls behind (network partition, maintenance), it resynchronizes from the replication log when reconnected. Keeper stores a configurable number of log entries (default: a few thousand).

```sql
-- Force resync if a replica is stuck
SYSTEM RESTART REPLICA events;

-- Wait for replicas to catch up
SYSTEM SYNC REPLICA events;
```

## ClickHouse Keeper vs ZooKeeper

ClickHouse 21.8+ ships its own `ClickHouse Keeper` implementation which is the recommended coordinator:
- Embeds in ClickHouse processes (no separate ZooKeeper cluster needed)
- Compatible with ZooKeeper client protocol
- Written in C++, tuned for ClickHouse access patterns

```bash
# Start a 3-node ClickHouse Keeper cluster via config
# keeper_server.xml configures raft participants
```

## Summary

ClickHouse replication coordinates via ClickHouse Keeper: each INSERT creates a part and logs it to a shared replication log. Other replicas download new parts from each other over HTTP. Merges are leader-coordinated to avoid duplication. Monitor replication health via `system.replicas` and `system.replication_queue`. Use `SYSTEM SYNC REPLICA` to wait for replicas to catch up after bulk loads or maintenance.
