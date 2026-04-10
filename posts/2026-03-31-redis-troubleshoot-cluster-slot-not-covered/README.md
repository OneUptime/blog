# How to Troubleshoot Redis Cluster Slot Not Covered

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Slot, Troubleshooting, High Availability

Description: Fix Redis cluster CLUSTERDOWN Hash slot not served errors by identifying uncovered slots, recovering failed nodes, and resharding or importing slots.

---

When a Redis cluster node fails and has no replicas to take over, or when a manual resharding leaves slots in an invalid state, clients receive errors like `CLUSTERDOWN Hash slot not served` or `(error) CLUSTERDOWN The cluster is down`. This guide shows how to diagnose and fix uncovered slots.

## Understand Hash Slots

Redis Cluster divides the keyspace into 16384 hash slots. Every key maps to a slot using CRC16. The cluster is healthy only when all 16384 slots are assigned to available nodes.

```bash
# Check overall cluster state
redis-cli -c CLUSTER INFO | grep -E "cluster_state|cluster_slots_ok|cluster_slots_pfail|cluster_slots_fail"

# Healthy output:
# cluster_state:ok
# cluster_slots_ok:16384
# cluster_slots_pfail:0
# cluster_slots_fail:0

# Problem output:
# cluster_state:fail
# cluster_slots_ok:16000
# cluster_slots_fail:384
```

## Identify Which Slots Are Uncovered

```bash
# Show which slots each node is responsible for
redis-cli -c CLUSTER SLOTS

# Get a flat list of node info
redis-cli -c CLUSTER NODES

# Find uncovered slots
redis-cli -c CLUSTER INFO | grep cluster_slots_fail
# If non-zero, run:
redis-cli -c CLUSTER SHARDS
```

Using redis-cli check:

```bash
redis-cli --cluster check <any-cluster-node>:6379
# Output will show:
# [ERR] Not all 16384 slots are covered by nodes.
# Slots 5500-5999 are NOT covered
```

## Cause 1: A Primary Node Went Down Without Replica

```bash
# Check cluster node states
redis-cli -c CLUSTER NODES | grep -E "fail|noaddr"
# Lines with "fail" indicate the failed node

# If the node is temporarily down, fix it first
# Restart the failed node and it will rejoin the cluster
sudo systemctl start redis-cluster-6381

# Verify it rejoined
redis-cli -c CLUSTER INFO | grep cluster_state
```

## Cause 2: Node Removed but Slots Not Reassigned

```bash
# Check if any node has no slots but is still referenced
redis-cli -c CLUSTER NODES | awk '{print $1, $3, $9}'
# nodeID flags slotrange

# A node with "noaddr" and slots assigned is problematic
```

### Fix: Use redis-cli reshard

```bash
# Interactive reshard - move slots to a new primary
redis-cli --cluster reshard <any-node>:6379

# You will be prompted for:
# How many slots do you want to move? -> enter number (e.g. 384)
# What is the receiving node ID? -> paste the ID of a healthy node
# Source node(s)? -> enter "all" or the specific failed node ID
```

### Fix: Scripted reshard for specific slots

```bash
redis-cli --cluster reshard <target-node>:6379 \
  --cluster-from <failed-node-id> \
  --cluster-to <healthy-node-id> \
  --cluster-slots 384 \
  --cluster-yes
```

## Cause 3: Slot in IMPORTING or MIGRATING State

A stalled resharding operation can leave slots in an intermediate state:

```bash
# Check for slots in migration state
# Migrating slots show as [slot->-nodeId], importing as [slot-<-nodeId]
redis-cli -c CLUSTER NODES | grep -E "\[.*->-|\[.*-<-"

# Fix a slot stuck in MIGRATING state on source node
redis-cli -h <source-node> -p 6381 CLUSTER SETSLOT <slot-number> STABLE

# Fix a slot stuck in IMPORTING state on target node
redis-cli -h <target-node> -p 6382 CLUSTER SETSLOT <slot-number> STABLE
```

## Fix All Uncovered Slots

```bash
# Assign uncovered slots to an existing primary
# First, find a healthy primary node's IP and port
redis-cli -c CLUSTER NODES | grep "master" | head -1

# CLUSTER ADDSLOTS assigns slots to the node you connect to,
# so connect directly to the healthy primary
for SLOT in $(seq 5500 5999); do
  redis-cli -h <healthy-primary-node> -p 6379 CLUSTER ADDSLOTS $SLOT
done

# Verify coverage
redis-cli --cluster check <any-node>:6379
```

## Verify Fix

```bash
# Cluster should show ok state
redis-cli -c CLUSTER INFO | grep cluster_state
# cluster_state:ok

redis-cli -c CLUSTER INFO | grep cluster_slots_ok
# cluster_slots_ok:16384

# Test a write to a previously uncovered slot key
redis-cli -c SET test:key "value"
# OK

# Run a full cluster check
redis-cli --cluster check <any-node>:6379
# Should end with: All nodes agree about slots configuration.
```

## Prevent Future Slot Coverage Failures

```bash
# Ensure every primary has at least 1 replica
redis-cli --cluster info <any-node>:6379

# Add a replica to an under-replicated primary
redis-cli --cluster add-node <new-node>:6379 <existing-node>:6379 --cluster-slave

# Check replication factor
redis-cli -c CLUSTER NODES | awk '{print $3}' | sort | uniq -c
```

## Summary

Redis cluster slot coverage errors are caused by node failures without replicas, or stalled resharding operations. Diagnose with `CLUSTER INFO` and `redis-cli --cluster check`, then fix by restarting failed nodes, using `reshard` to move slots to healthy primaries, or resolving stuck MIGRATING/IMPORTING states with `CLUSTER SETSLOT ... STABLE`. Always ensure every primary has at least one replica.
