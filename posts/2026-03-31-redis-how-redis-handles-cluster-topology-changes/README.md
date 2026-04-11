# How Redis Handles Cluster Topology Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Topology, Failover, Resharding, Gossip Protocol

Description: Understand how Redis Cluster detects and adapts to topology changes including node failures, slot migrations, and new node additions using the gossip protocol.

---

## What Are Cluster Topology Changes?

A Redis Cluster topology change is any modification to the set of nodes and slot assignments that make up the cluster. This includes:

- A primary node failing (requires failover)
- Adding new nodes and resharding slots
- Removing nodes and rebalancing
- A network partition causing split-brain detection

Redis Cluster handles these changes automatically using its gossip protocol and consensus mechanism.

## The Gossip Protocol

Redis Cluster nodes communicate using a gossip protocol over the cluster bus (default port: data port + 10000, e.g., 16379). Each node:

1. Periodically selects a few random nodes and exchanges cluster state information
2. Propagates information about node health, epochs, and slot assignments
3. Marks nodes as `PFAIL` (probable failure) after missing heartbeats

```bash
# View cluster bus port (shown after @ in node addresses)
redis-cli CLUSTER NODES | head -1

# View gossip messages sent/received
redis-cli CLUSTER INFO | grep cluster_stats_messages
```

## Node Failure Detection

### PFAIL and FAIL states

When a node does not respond within `cluster-node-timeout` (default 15s), it is marked `PFAIL`:

```bash
# Check cluster-node-timeout
redis-cli CONFIG GET cluster-node-timeout
# Default: 15000 (milliseconds)
```

A node transitions from `PFAIL` to `FAIL` when a majority of primary nodes also report it as `PFAIL`. At this point, failover begins.

```bash
# See node states in CLUSTER NODES output
redis-cli CLUSTER NODES | grep pfail
redis-cli CLUSTER NODES | grep fail
```

## Automatic Failover Process

When a primary enters `FAIL` state:

1. The primary's replicas start an election
2. Each replica requests votes from other primaries
3. The replica with the most up-to-date replication offset wins
4. The winning replica promotes itself and takes over the failed node's slots

```text
Timeline:
T+0s:    Primary stops responding
T+15s:   Replicas mark primary as PFAIL
T+17s:   Majority of primaries agree -> FAIL state
T+17s:   Replica elections start
T+18s:   Winning replica promotes itself
T+19s:   Cluster propagates new topology via gossip
T+20s:   Clients receive MOVED/ASK redirects to new primary
```

```bash
# Monitor failover in progress
watch -n 1 "redis-cli CLUSTER NODES | awk '{print \$1, \$3, \$4}'"

# After failover, verify old master now shows as slave
redis-cli CLUSTER NODES | grep <old-master-id>
```

## Slot Migration During Resharding

When slots move between nodes, clients receive `ASK` redirections:

```text
Client -> Node A: GET mykey
Node A -> Client: -ASK 4567 10.0.0.2:6379

Client -> Node B: ASKING
Client -> Node B: GET mykey
Node B -> Client: "value"
```

Redis clients handle ASK transparently. After migration completes, `MOVED` responses redirect permanently.

```bash
# Start a reshard operation
redis-cli --cluster reshard <any-node>:6379 \
  --cluster-from <source-node-id> \
  --cluster-to <target-node-id> \
  --cluster-slots 1000 \
  --cluster-yes

# Monitor migration progress (look for importing/migrating flags)
redis-cli CLUSTER NODES | grep -E "migrating|importing"
```

```python
# Client-side: handle MOVED and ASK automatically
from redis.cluster import RedisCluster, ClusterNode

rc = RedisCluster(
    startup_nodes=[ClusterNode("redis-1", 6379)],
    decode_responses=True,
    require_full_coverage=True,  # Verify all slots covered
)

# RedisCluster handles MOVED and ASK transparently
value = rc.get('mykey')
```

## Adding Nodes to the Cluster

```bash
# Add a new primary node
redis-cli --cluster add-node new-node:6379 existing-node:6379

# Add a new replica
redis-cli --cluster add-node new-node:6379 existing-node:6379 \
  --cluster-slave \
  --cluster-master-id <master-node-id>

# After adding, rebalance slots across all primaries
redis-cli --cluster rebalance existing-node:6379 --cluster-use-empty-masters
```

## Removing Nodes from the Cluster

```bash
# First, move all slots off the node being removed
redis-cli --cluster reshard existing-node:6379 \
  --cluster-from <node-to-remove-id> \
  --cluster-to <receiving-node-id> \
  --cluster-slots 5461

# Then delete the empty node
redis-cli --cluster del-node existing-node:6379 <node-to-remove-id>
```

## Configuring Topology Change Behavior

```bash
# How long before a node is considered failed
redis-cli CONFIG SET cluster-node-timeout 15000

# Require all 16384 hash slots to be covered for the cluster to accept writes
redis-cli CONFIG SET cluster-require-full-coverage yes

# Allow writes even when some slots are uncovered
redis-cli CONFIG SET cluster-require-full-coverage no

# Allow reads from replicas (tradeoff: stale reads possible)
redis-cli CONFIG SET replica-serve-stale-data yes
```

## Summary

Redis Cluster handles topology changes automatically using a gossip-based failure detection protocol and epoch-based consensus for elections. Node failures trigger automatic replica promotion after `cluster-node-timeout` elapses and a majority of primaries confirm the failure. Slot migrations during resharding use ASK redirections to keep clients functional during the move. Understanding this process helps you tune timeouts, design for partition tolerance, and respond effectively during incidents.
