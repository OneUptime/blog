# How to Set Up Two-Node ClickHouse Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, ReplicatedMergeTree, ClickHouse Keeper, High Availability, Cluster

Description: Step-by-step guide to setting up two-node ClickHouse replication using ReplicatedMergeTree and ClickHouse Keeper for high availability.

---

Two-node ClickHouse replication provides redundancy so that if one node fails, the other continues serving queries. This setup uses `ReplicatedMergeTree` for table-level replication and ClickHouse Keeper (or ZooKeeper) for coordination.

## Architecture Overview

- Node 1 (ch1): replica 1 of shard 1
- Node 2 (ch2): replica 2 of shard 1
- ClickHouse Keeper: can run embedded on one or both nodes (3-node Keeper is recommended for production quorum)

## Configure config.xml on Both Nodes

On each node, define the cluster topology in `/etc/clickhouse-server/config.d/cluster.xml`:

```xml
<clickhouse>
  <remote_servers>
    <my_cluster>
      <shard>
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

  <zookeeper>
    <node>
      <host>ch1</host>
      <port>9181</port>
    </node>
  </zookeeper>

  <macros>
    <shard>01</shard>
    <replica>ch1</replica>  <!-- change to ch2 on node 2 -->
  </macros>
</clickhouse>
```

## Create a Replicated Table

```sql
CREATE TABLE events ON CLUSTER my_cluster (
    event_time DateTime,
    user_id    UInt64,
    event_type String
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);
```

The `{shard}` and `{replica}` macros are substituted per node. Every replica for the same table must share the same ZooKeeper path prefix and have a unique replica name.

## Verify Replication is Working

```sql
SELECT
    database, table, replica_name, is_leader,
    inserts_in_queue, queue_size, last_queue_update
FROM system.replicas
WHERE table = 'events';
```

Each node should show its local replica with `is_leader = 1` (multiple replicas can be leaders simultaneously) and `queue_size = 0` once sync completes.

## Insert and Verify Data

```sql
-- Insert on node ch1
INSERT INTO events VALUES (now(), 1001, 'pageview');

-- Query on ch2 - should return the same row
SELECT * FROM events ORDER BY event_time DESC LIMIT 5;
```

## Handle Network Partitions

With only two nodes and no quorum, a network partition will cause both nodes to accept writes independently. To prevent split-write scenarios, use quorum inserts:

```sql
SET insert_quorum = 2;
SET insert_quorum_timeout = 10000; -- 10 seconds
```

This ensures writes are confirmed on both replicas before returning success.

## Summary

Two-node ClickHouse replication is straightforward with `ReplicatedMergeTree`, shared ZooKeeper/Keeper coordination, and per-node macros. For production workloads, combine this with quorum inserts and a three-node Keeper ensemble to ensure no single point of failure in the coordination layer.
