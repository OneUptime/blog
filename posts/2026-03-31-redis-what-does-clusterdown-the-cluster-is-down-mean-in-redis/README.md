# What Does 'CLUSTERDOWN The cluster is down' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, CLUSTERDOWN, Cluster, High Availability, Troubleshooting

Description: Understand why Redis Cluster returns CLUSTERDOWN, what causes cluster failure states, and how to diagnose and restore a failed Redis Cluster.

---

## What Is the CLUSTERDOWN Error

When a Redis Cluster loses quorum or has hash slots without a reachable primary, all commands return:

```text
(error) CLUSTERDOWN The cluster is down
```

Redis Cluster requires that all 16,384 hash slots are covered by a reachable primary node. If any slot range has no primary (and no replica that can be promoted), the cluster enters a CLUSTERDOWN state and rejects all commands.

## Why Does the Cluster Go Down

### Not Enough Primary Nodes

The most common cause is losing too many primary nodes simultaneously:

- A 3-node cluster (no replicas) loses 1 node: slots from that node are uncovered
- A 6-node cluster (3 primaries, 3 replicas) loses 1 primary and its replica is offline: slots uncovered
- Network partition separates a majority of nodes

### Quorum Failure

Redis Cluster uses a gossip protocol and requires a majority of master nodes to agree for automatic failover. With 3 primaries, you need at least 2 masters reachable. Adding replicas does not change this quorum requirement - with 3 primaries and 3 replicas, you still need at least 2 masters reachable for failover to proceed.

### Manual Failover or Misconfiguration

Running `CLUSTER RESET` on a node, incorrect `cluster-node-timeout`, or misconfigured `cluster-config-file` paths can cause nodes to disagree on cluster state.

## How to Diagnose

### Check Cluster State

```bash
redis-cli -h any-cluster-node -p 6379 CLUSTER INFO
```

```text
cluster_enabled:1
cluster_state:fail
cluster_slots_assigned:16384
cluster_slots_ok:10922
cluster_slots_pfail:5462
cluster_slots_fail:5462
cluster_known_nodes:6
cluster_size:3
```

`cluster_state:fail` confirms the cluster is down. `cluster_slots_fail` shows how many slots have no reachable primary.

### Check Node Status

```bash
redis-cli -h any-cluster-node -p 6379 CLUSTER NODES
```

Look for nodes marked with `fail` or `disconnected`:

```text
abc123 10.0.0.1:6379@16379 master - 0 1743417600000 1 connected 0-5460
def456 10.0.0.2:6379@16379 master,fail - 1743417500000 1743417500000 2 disconnected 5461-10922
ghi789 10.0.0.3:6379@16379 master - 0 1743417600000 3 connected 10923-16383
```

### Check Individual Node Health

```bash
for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
  echo "=== $node ==="
  redis-cli -h $node -p 6379 PING 2>&1
done
```

## How to Fix

### Fix 1 - Restart Failed Nodes

If a primary node crashed, restart it. If a replica still holds that node's data, Redis Cluster will automatically elect the replica as the new primary:

```bash
sudo systemctl start redis
```

Or in Docker:

```bash
docker start redis-node-2
```

Watch for automatic failover:

```bash
redis-cli -h 10.0.0.1 -p 6379 CLUSTER NODES | grep -v slave
```

### Fix 2 - Trigger Manual Failover from a Replica

If a primary is down and you need to manually promote a replica:

```bash
# On the replica that should become primary
redis-cli -h replica-host -p 6379 CLUSTER FAILOVER FORCE
```

### Fix 3 - Add New Node to Cover Lost Slots

If a primary node is permanently lost with no replica:

```bash
# Start a new Redis node
redis-server /etc/redis/redis-node-new.conf

# Add it to the cluster
redis-cli --cluster add-node 10.0.0.4:6379 10.0.0.1:6379

# Reshard lost slots to the new node
redis-cli --cluster reshard 10.0.0.1:6379
```

During resharding, specify the slot range and target node ID.

### Fix 4 - Restore from Backup

If data loss is acceptable and you need to quickly restore:

```bash
# Stop all cluster nodes
# Restore dump.rdb to all nodes from backup
# Start cluster with cluster-reset hard
redis-cli CLUSTER RESET HARD
# Re-create cluster
redis-cli --cluster create 10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379
```

## Preventing CLUSTERDOWN

### Always Deploy with Replicas

A single primary with no replica is a single point of failure. Use at least 1 replica per shard:

```bash
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1
```

### Tune cluster-node-timeout

Default is 15 seconds. Lower it to detect failures faster:

```text
# In redis.conf
cluster-node-timeout 5000
```

### Spread Nodes Across Availability Zones

Place primaries and replicas in different AZs so a single AZ failure does not take down a full shard.

### Monitor Cluster State

```yaml
# Prometheus alert
- alert: RedisClusterDown
  expr: redis_cluster_state == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Redis cluster is in FAIL state"
```

## Summary

The CLUSTERDOWN error means Redis Cluster has hash slots with no reachable primary node. Diagnose it with `CLUSTER INFO` and `CLUSTER NODES` to identify failed nodes. Fix it by restarting crashed nodes and allowing automatic replica promotion, or triggering a manual failover. Prevent CLUSTERDOWN by always deploying at least 1 replica per shard, spreading nodes across availability zones, and monitoring `cluster_state` in Prometheus.
