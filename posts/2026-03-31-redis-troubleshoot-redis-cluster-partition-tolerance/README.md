# How to Troubleshoot Redis Cluster Partition Tolerance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Partition, High Availability, Troubleshooting

Description: Diagnose and recover from Redis Cluster network partitions including split-brain scenarios, CLUSTERDOWN errors, and slot coverage failures.

---

Redis Cluster provides automatic failover and data sharding, but network partitions can leave the cluster in a degraded state. Understanding how Redis Cluster handles partitions helps you recover faster and design more resilient systems.

## How Redis Cluster Handles Partitions

Redis Cluster requires a majority of nodes to function. With 3 primary nodes, at least 2 must be reachable for the cluster to accept writes. When a partition occurs:

- The minority side becomes unavailable (CLUSTERDOWN)
- The majority side elects new primaries from replicas
- After the partition heals, the minority side rejoins

## Check Cluster Health

```bash
redis-cli CLUSTER INFO
```

Key fields:

```text
cluster_enabled:1
cluster_state:ok          # or "fail" during partition
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_slots_pfail:0     # possibly failed
cluster_slots_fail:0      # definitely failed
cluster_known_nodes:6
cluster_size:3
```

If `cluster_state` is `fail`, the cluster cannot serve requests.

## Identify Partitioned Nodes

```bash
redis-cli CLUSTER NODES
```

Look for nodes flagged as `fail` or `noaddr`:

```text
<id> 10.0.0.1:6379 master - 0 1700000000 1 connected 0-5460
<id> 10.0.0.2:6379 master,fail - 1699999990 1700000000 2 disconnected 5461-10922
<id> 10.0.0.3:6379 master - 0 1700000000 3 connected 10923-16383
```

## Manual Failover

If you need to perform a planned failover while the primary is still reachable, connect to the replica:

```bash
# Connect to the replica (requires the primary to be reachable)
redis-cli -h 10.0.0.5 -p 6379 CLUSTER FAILOVER
```

If the primary is down and its replica hasn't auto-failed over, force the failover:

```bash
redis-cli -h 10.0.0.5 -p 6379 CLUSTER FAILOVER FORCE
```

## Fix Slot Coverage Issues

After a partition, some slots may be uncovered. Check:

```bash
redis-cli --cluster check 10.0.0.1:6379
```

To fix slot assignment issues:

```bash
redis-cli --cluster fix 10.0.0.1:6379
```

## Recover a Node After Partition Heals

When a partitioned node comes back, it should rejoin automatically. If it doesn't:

```bash
# On the returning node, reset and rejoin
redis-cli CLUSTER RESET SOFT

# Re-add it to the cluster from an existing node
redis-cli --cluster add-node 10.0.0.2:6379 10.0.0.1:6379
```

## Prevent Data Loss During Partitions

Configure `cluster-require-full-coverage` to prevent serving stale data:

```text
# redis.conf
cluster-require-full-coverage yes
```

With this enabled, the cluster rejects reads and writes if any slot is uncovered. Also increase `cluster-node-timeout` to reduce false failovers during temporary network blips:

```text
cluster-node-timeout 15000
```

## Summary

Redis Cluster partition tolerance depends on majority quorum. Use `CLUSTER INFO` and `CLUSTER NODES` to identify the partition state, `CLUSTER FAILOVER FORCE` to promote replicas manually, and `redis-cli --cluster fix` to repair slot coverage after recovery. Configure `cluster-node-timeout` appropriately to avoid triggering unnecessary failovers during brief network interruptions.
