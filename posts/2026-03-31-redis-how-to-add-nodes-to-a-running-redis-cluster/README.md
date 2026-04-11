# How to Add Nodes to a Running Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Scaling, Operation, Node Management

Description: Learn how to add new primary and replica nodes to a running Redis Cluster, including slot rebalancing and resharding steps.

---

## When to Add Nodes

Add nodes to a Redis Cluster when:

- Memory usage on existing nodes is approaching capacity
- Write throughput is saturating existing primaries
- You need more replicas for higher availability
- Adding geographic distribution

## Prerequisites

- A running Redis Cluster (minimum 3 primaries + 3 replicas)
- A new Redis instance configured for cluster mode
- `redis-cli` available on your management machine

## Step 1 - Configure the New Node

Create a configuration for the new node:

```text
# /etc/redis/cluster-node7.conf
port 7006
cluster-enabled yes
cluster-config-file nodes-7006.conf
cluster-node-timeout 5000
appendonly yes
requirepass "clusterPassword"
masterauth "clusterPassword"
bind 0.0.0.0
```

Start the new Redis instance:

```bash
redis-server /etc/redis/cluster-node7.conf
```

## Step 2 - Add the Node to the Cluster

Use `redis-cli --cluster add-node` to join the new node to the cluster:

```bash
redis-cli --cluster add-node \
  192.168.1.17:7006 \
  192.168.1.11:7001 \
  -a clusterPassword
```

- First address: the new node to add
- Second address: any existing node in the cluster

The new node joins as a primary with no hash slots assigned.

Verify it joined:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES | grep 192.168.1.17
```

You will see the new node listed with no slot range.

## Step 3 - Add a Replica Node (Optional)

To add a replica for the new node, first get the node ID of the target primary:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES
```

Look for the new primary's ID in the output, then add the replica:

```bash
redis-cli --cluster add-node \
  192.168.1.18:7007 \
  192.168.1.11:7001 \
  --cluster-slave \
  --cluster-master-id <new-primary-node-id> \
  -a clusterPassword
```

Verify:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES
```

The replica should show the primary's ID as its parent.

## Step 4 - Rebalance Hash Slots

New primary nodes start with no hash slots, so no data is stored on them yet. Rebalance to distribute slots evenly:

```bash
redis-cli --cluster rebalance \
  192.168.1.11:7001 \
  --cluster-use-empty-masters \
  -a clusterPassword
```

This command calculates the optimal slot distribution and migrates slots automatically. For a cluster with 4 primaries and 16384 slots, each primary should receive approximately 4096 slots.

You can also specify a specific weight for the new node:

```bash
redis-cli --cluster rebalance \
  192.168.1.11:7001 \
  --cluster-weight 192.168.1.17:7006=1.5 \
  -a clusterPassword
```

## Step 5 - Manual Resharding (Alternative to Rebalance)

For more control, use `reshard` to manually move a specific number of slots:

```bash
redis-cli --cluster reshard \
  192.168.1.11:7001 \
  -a clusterPassword
```

You will be prompted for:

1. How many slots to move
2. The ID of the destination node (the new node)
3. Source node IDs (or `all` to spread across all existing nodes)

Example interactive session:

```text
How many slots do you want to move (from 1 to 16384)? 4096
What is the receiving node ID? <new-node-id>
Please enter all the source node IDs.
  Type 'all' to use all the nodes as source nodes for the hash slots.
  Type 'done' once you entered all the source nodes IDs.
Source node #1: all
Do you want to proceed with the proposed reshard plan (yes/no)? yes
```

## Monitoring Migration Progress

During resharding, monitor slot assignment progress:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER INFO | grep cluster_slots
```

To see which specific slots are being migrated, check `CLUSTER NODES` where migrating slots appear as `[slot->-node_id]`:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES | grep "\->"
```

You can also watch cluster node slot assignments:

```bash
watch -n 2 "redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES"
```

## Verifying the New Node Is Serving Traffic

After resharding, verify the new node has slots and is accessible:

```bash
redis-cli -h 192.168.1.17 -p 7006 -a clusterPassword CLUSTER INFO
```

Look for:

```text
cluster_enabled:1
cluster_state:ok
cluster_slots_assigned:16384
cluster_known_nodes:8
```

Note that `cluster_slots_assigned` reports the cluster-wide total, not the per-node count. A healthy cluster always shows `16384`. To check how many slots are assigned to this specific node, use:

```bash
redis-cli -h 192.168.1.17 -p 7006 -a clusterPassword CLUSTER NODES | grep myself
```

The output will show the slot ranges assigned to this node.

Test with a key that hashes to the new node's slots:

```bash
redis-cli -h 192.168.1.17 -p 7006 -a clusterPassword -c SET testkey "value"
```

The `-c` flag enables cluster mode, allowing automatic slot redirection.

## Summary

Adding nodes to a running Redis Cluster involves configuring the new instance with cluster mode enabled, joining it with `add-node`, and then migrating hash slots via `rebalance` or `reshard`. New primaries start with no slots and only begin serving traffic after slot migration. Using `--cluster rebalance` is the easiest approach for even distribution, while manual `reshard` gives precise control over which slots move from which sources.
