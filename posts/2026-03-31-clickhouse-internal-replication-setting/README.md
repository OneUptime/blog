# How to Use internal_replication Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, internal_replication, Distributed Table, Replication, Cluster, Setting

Description: Understand the internal_replication setting in ClickHouse Distributed tables and when to enable it for correct replicated insert behavior.

---

The `internal_replication` setting in a ClickHouse cluster configuration controls how the `Distributed` table engine handles inserts to shards that have multiple replicas. Choosing the wrong value leads to data duplication or incorrect replication behavior.

## What internal_replication Does

When `internal_replication = false` (default), the Distributed engine sends each inserted block to **all** replicas of a shard. Each replica independently receives and stores the data.

When `internal_replication = true`, the Distributed engine sends the insert to **one** replica per shard and lets `ReplicatedMergeTree` handle propagation to the other replicas via the replication log.

## Configuration in cluster.xml

```xml
<remote_servers>
  <my_cluster>
    <shard>
      <internal_replication>true</internal_replication>
      <replica>
        <host>ch1</host>
        <port>9000</port>
      </replica>
      <replica>
        <host>ch2</host>
        <port>9000</port>
      </replica>
    </shard>
  </my_cluster>
</remote_servers>
```

## When to Use internal_replication = true

Use `true` when your local tables are `ReplicatedMergeTree`. This is the recommended production setting because:

- Inserts are deduplicated by the replication log (idempotent on retry)
- The Distributed engine does not duplicate data to all replicas
- Data consistency is managed by ClickHouse Keeper/ZooKeeper

```sql
-- Local table uses ReplicatedMergeTree
CREATE TABLE events_local ON CLUSTER my_cluster (
    event_time DateTime,
    user_id UInt64
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY (user_id, event_time);

-- Distributed table with internal_replication = true in config
CREATE TABLE events ON CLUSTER my_cluster AS events_local
ENGINE = Distributed('my_cluster', 'default', 'events_local', intHash64(user_id));
```

## When to Use internal_replication = false

Use `false` only when local tables are plain `MergeTree` (not replicated) and you want the Distributed engine to manually fan-out writes to all replicas. This is less common and harder to keep consistent.

## Verifying Insert Behavior

With `internal_replication = true`, inserts to the Distributed table go to one replica per shard:

```sql
INSERT INTO events VALUES (now(), 1001);

-- Check rows on each replica to see where data landed
SELECT hostName() AS host, count() AS rows
FROM clusterAllReplicas('my_cluster', default.events_local)
GROUP BY host;
```

Both replicas should eventually have the same data once replication catches up.

## Common Mistake

Mixing `internal_replication = true` with non-replicated local tables causes data to land on only one replica and never propagate - resulting in data loss if that replica fails.

## Summary

Set `internal_replication = true` whenever your shard tables use `ReplicatedMergeTree`. This lets the replication engine handle consistency and deduplication correctly. Only use `false` with plain `MergeTree` when you intentionally want the Distributed engine to broadcast writes to every replica manually.
