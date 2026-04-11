# How to Use CLUSTER MEET in Redis to Add Nodes to a Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Node, Scaling, Operation

Description: Learn how to use CLUSTER MEET in Redis to introduce a new node to an existing cluster, enabling horizontal scaling and slot redistribution.

---

## What Is CLUSTER MEET?

`CLUSTER MEET` is a Redis Cluster command that instructs the current node to establish a connection with another Redis node and integrate it into the cluster's gossip communication network. Once two nodes meet, the cluster's gossip protocol propagates the new node's existence to all other cluster members.

This command is the fundamental building block for expanding a Redis Cluster by adding new nodes.

## Basic Syntax

```text
CLUSTER MEET ip port
```

Parameters:
- `ip` - IP address or hostname of the node to introduce
- `port` - Port number of the node to meet (Redis 4.0+ also accepts an optional `cluster-bus-port`)

## Adding a New Node to the Cluster

Assume your cluster already has nodes at `192.168.1.10:6379` and you want to add a new node at `192.168.1.20:6379`.

Connect to any existing cluster node and run:

```bash
redis-cli -h 192.168.1.10 -p 6379 CLUSTER MEET 192.168.1.20 6379
# Returns: OK
```

After a few seconds, verify the new node appears in the cluster:

```bash
redis-cli -h 192.168.1.10 -p 6379 CLUSTER NODES | grep 192.168.1.20
```

## How Gossip Propagation Works

When you run `CLUSTER MEET`, the following happens:

1. The source node initiates a handshake with the target node
2. Both nodes exchange cluster state information
3. Through gossip, all other cluster nodes learn about the new node within seconds
4. The new node appears in `CLUSTER NODES` output across all members

```bash
# Check cluster info to see total node count
redis-cli -h 192.168.1.10 -p 6379 CLUSTER INFO | grep cluster_known_nodes
# cluster_known_nodes:7  (after adding node)
```

## New Node State Before Slot Assignment

A newly added node via `CLUSTER MEET` starts as a master with no slot assignments. You must subsequently either:

1. Run `redis-cli --cluster reshard` to move slots to it (making it a master)
2. Run `CLUSTER REPLICATE` to make it a replica of an existing master

```bash
# Verify the new node has no slots assigned yet
redis-cli -h 192.168.1.20 -p 6379 CLUSTER NODES | grep myself
# Output shows: myself,master - 0 0 0 connected  (no slot range at the end)
```

## Full Workflow: Adding a Master Node

```bash
# Step 1: Start a new Redis instance (no cluster config initially)
redis-server --port 6380 --cluster-enabled yes --cluster-config-file nodes-6380.conf

# Step 2: Meet the new node from an existing cluster member
redis-cli -h 127.0.0.1 -p 6379 CLUSTER MEET 127.0.0.1 6380

# Step 3: Verify it joined
redis-cli -h 127.0.0.1 -p 6379 CLUSTER NODES

# Step 4: Reshard slots to the new master
redis-cli --cluster reshard 127.0.0.1:6379 \
  --cluster-from all \
  --cluster-to <new-node-id> \
  --cluster-slots 1000 \
  --cluster-yes
```

## Full Workflow: Adding a Replica Node

```bash
# Step 1: Meet the new node
redis-cli -h 127.0.0.1 -p 6379 CLUSTER MEET 127.0.0.1 6381

# Step 2: Connect to the new node and replicate an existing master
redis-cli -h 127.0.0.1 -p 6381 CLUSTER REPLICATE <master-node-id>

# Step 3: Verify replication
redis-cli -h 127.0.0.1 -p 6379 CLUSTER NODES | grep 6381
```

## Using redis-cli --cluster add-node

For a higher-level alternative that combines `CLUSTER MEET` with role assignment:

```bash
# Add as a master
redis-cli --cluster add-node 192.168.1.20:6379 192.168.1.10:6379

# Add as a replica of a specific master
redis-cli --cluster add-node 192.168.1.21:6379 192.168.1.10:6379 \
  --cluster-slave \
  --cluster-master-id <master-node-id>
```

## Python Example

```python
import redis

# Connect to an existing cluster node
r = redis.Redis(host='192.168.1.10', port=6379, decode_responses=True)

# Introduce a new node
result = r.cluster('meet', '192.168.1.20', 6379)
print(result)  # True (OK)

# Check cluster knows about the new node
import time
time.sleep(2)

nodes = r.cluster('nodes')
print(f"Total nodes: {len(nodes)}")
```

## Summary

`CLUSTER MEET` is the entry point for adding new nodes to a Redis Cluster. It initiates gossip-based discovery so all cluster members learn about the new node. After meeting, the node must be assigned slots (to become a master) or configured as a replica via `CLUSTER REPLICATE`. For production use, the `redis-cli --cluster add-node` wrapper provides a more convenient interface that handles both the meet and role assignment steps.
