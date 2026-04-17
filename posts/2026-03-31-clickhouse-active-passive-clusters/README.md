# How to Set Up Active-Passive ClickHouse Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, High Availability, Failover, Replication

Description: Learn how to configure an active-passive ClickHouse cluster where a standby replica takes over automatically when the primary node fails.

---

## What Is an Active-Passive Cluster?

In an active-passive setup, one node (the primary) handles all traffic while one or more standby nodes replicate data but remain idle unless the primary fails. This is simpler to manage than active-active and is a good fit for write-heavy workloads where you want predictable behavior.

## Architecture Overview

```text
Writes/Reads --> Primary (ch-node-1)
                    |  ReplicatedMergeTree
                    v
               Standby (ch-node-2)
```

ZooKeeper or ClickHouse Keeper coordinates the leader election between replicas.

## ClickHouse Keeper Configuration

Add to `config.xml` on all nodes (set `<server_id>` to match each node's own id — `1` on `ch-node-1`, `2` on `ch-node-2`):

```xml
<keeper_server>
  <tcp_port>9181</tcp_port>
  <server_id>1</server_id>
  <raft_configuration>
    <server>
      <id>1</id>
      <hostname>ch-node-1</hostname>
      <port>9234</port>
    </server>
    <server>
      <id>2</id>
      <hostname>ch-node-2</hostname>
      <port>9234</port>
    </server>
  </raft_configuration>
</keeper_server>
```

## Creating the Replicated Table

Run on both nodes (with different replica names):

```sql
-- On ch-node-1
CREATE TABLE orders_local
(
    order_id    UInt64,
    customer_id UInt64,
    total       Float64,
    created_at  DateTime
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/default/orders',
    'replica-1'
)
ORDER BY (customer_id, created_at);

-- On ch-node-2
CREATE TABLE orders_local
(
    order_id    UInt64,
    customer_id UInt64,
    total       Float64,
    created_at  DateTime
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/default/orders',
    'replica-2'
)
ORDER BY (customer_id, created_at);
```

## Directing Traffic to the Primary

Configure your application or load balancer to send all writes to `ch-node-1`. For a health-check-based failover, use a TCP health check:

```bash
clickhouse-client --host ch-node-1 --query "SELECT 1" || \
  clickhouse-client --host ch-node-2 --query "SELECT 1"
```

## Manual Failover Steps

If `ch-node-1` goes down:

```bash
# Verify replica-2 is up to date
clickhouse-client --host ch-node-2 \
  --query "SELECT * FROM system.replicas WHERE table = 'orders_local'"

# Point your application to ch-node-2
```

## Monitoring Replication Lag

```sql
SELECT
    replica_name,
    queue_size,
    inserts_in_queue,
    log_max_index - log_pointer AS replication_lag
FROM system.replicas
WHERE table = 'orders_local';
```

A replication lag of 0 means the standby is fully synchronized and ready for failover.

## Automatic Read Failover with Distributed Table

Even in an active-passive setup, you can still use a Distributed table for automatic read fallback:

```sql
CREATE TABLE orders_distributed
ENGINE = Distributed('active_passive_cluster', 'default', 'orders_local', rand());
```

Configure the cluster with `internal_replication = true` so only one replica is written to per shard.

## Summary

Active-passive ClickHouse clusters rely on `ReplicatedMergeTree` to keep a standby node synchronized. Traffic is normally directed to the primary. On failure, you redirect to the standby - either manually or via a load balancer health check. Monitor `system.replicas` for replication lag to ensure failover will succeed with minimal data loss.
