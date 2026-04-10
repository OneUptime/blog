# Redis Runbook: Handling Cluster Node Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Runbook

Description: Runbook for responding to Redis Cluster node failures - detecting failed nodes, promoting replicas, and rebalancing hash slots after recovery.

---

In Redis Cluster, when a primary node fails, its replicas should automatically promote. This runbook covers how to detect failures, verify automatic failover, and manually intervene when needed.

## Step 1: Detect Node Failures

Check the cluster state:

```bash
redis-cli CLUSTER INFO | grep cluster_state
```

A `cluster_state:fail` means the cluster cannot serve requests. Check which nodes are down:

```bash
redis-cli CLUSTER NODES | grep fail
```

## Step 2: Identify Affected Hash Slots

Find out which hash slots are down:

```bash
redis-cli CLUSTER NODES | grep fail
```

Note the node ID and its assigned hash slots.

## Step 3: Verify Automatic Failover

If the failed node had replicas, check whether promotion happened:

```bash
redis-cli CLUSTER NODES | grep master
```

A replica should now appear as `master`. This usually takes a few seconds based on `cluster-node-timeout`.

## Step 4: Manually Trigger Failover

If automatic failover did not occur, connect to a replica and trigger it:

```bash
redis-cli -h <replica-ip> -p 6379 CLUSTER FAILOVER
```

Use `CLUSTER FAILOVER FORCE` if the primary is completely unreachable:

```bash
redis-cli -h <replica-ip> -p 6379 CLUSTER FAILOVER FORCE
```

## Step 5: Add a New Node to Replace the Failed One

Start a new Redis instance, then add it as a replica:

```bash
redis-cli --cluster add-node <new-node-ip>:6379 <existing-node-ip>:6379 --cluster-replica
```

## Step 6: Rebalance the Cluster

After recovery, check for slot imbalances:

```bash
redis-cli --cluster check <any-node-ip>:6379
```

Rebalance if needed:

```bash
redis-cli --cluster rebalance <any-node-ip>:6379 --cluster-use-empty-masters
```

## Step 7: Remove the Failed Node

Once the cluster is healthy, remove the dead node entry:

```bash
redis-cli CLUSTER FORGET <failed-node-id>
```

Repeat this command on all cluster nodes within 60 seconds to prevent gossip from re-adding the forgotten node.

## Step 8: Verify Recovery

Confirm the cluster is fully operational:

```bash
redis-cli CLUSTER INFO
redis-cli --cluster check <any-node-ip>:6379
```

## Summary

Redis Cluster node failures should trigger automatic failover within the configured `cluster-node-timeout`. When automatic failover does not occur, manual intervention via `CLUSTER FAILOVER FORCE` on a replica resolves the issue. Always rebalance and verify cluster state after recovery.
