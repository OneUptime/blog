# How to Use Redis CLI --cluster Commands for Cluster Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLI, Cluster, Management, Shard

Description: Learn how to use redis-cli --cluster subcommands to create, inspect, reshard, rebalance, and manage Redis Cluster nodes from the command line.

---

`redis-cli --cluster` is the built-in tool for managing Redis Cluster operations. It provides subcommands for creating clusters, adding and removing nodes, resharding slots, and checking cluster health.

## Creating a New Cluster

To create a 3-primary, 3-replica cluster:

```bash
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1
```

Redis auto-assigns 16384 slots evenly across the 3 primaries and pairs each primary with a replica.

## Checking Cluster Info

```bash
redis-cli --cluster info 10.0.0.1:6379
```

Output:

```text
10.0.0.1:6379 (abc12345...) -> 0 keys | 5461 slots | 1 slaves.
10.0.0.2:6379 (def67890...) -> 0 keys | 5462 slots | 1 slaves.
10.0.0.3:6379 (ghi13579...) -> 0 keys | 5461 slots | 1 slaves.
[OK] 0 keys in 3 masters.
0.00 keys per slot on average.
```

## Checking Cluster Health

```bash
redis-cli --cluster check 10.0.0.1:6379
```

Output includes warnings about unassigned slots, disconnected nodes, or replication issues.

## Adding a New Primary Node

```bash
# Start Redis on the new node (10.0.0.7:6379), then:
redis-cli --cluster add-node 10.0.0.7:6379 10.0.0.1:6379
```

The new node joins but has no slots. Reshard to give it slots:

```bash
redis-cli --cluster reshard 10.0.0.1:6379 \
  --cluster-from all \
  --cluster-to <new-node-id> \
  --cluster-slots 1500 \
  --cluster-yes
```

## Adding a Replica Node

```bash
redis-cli --cluster add-node 10.0.0.8:6379 10.0.0.1:6379 \
  --cluster-slave \
  --cluster-master-id <master-node-id>
```

## Resharding Slots

Move 500 slots from one node to another:

```bash
redis-cli --cluster reshard 10.0.0.1:6379 \
  --cluster-from <source-node-id> \
  --cluster-to <target-node-id> \
  --cluster-slots 500 \
  --cluster-yes
```

## Rebalancing the Cluster

Evenly redistribute slots across all primaries:

```bash
redis-cli --cluster rebalance 10.0.0.1:6379 --cluster-use-empty-masters
```

## Removing a Node

First migrate its slots away (use reshard). Then:

```bash
redis-cli --cluster del-node 10.0.0.1:6379 <node-id-to-remove>
```

## Fixing a Broken Cluster

After a crash or network partition:

```bash
redis-cli --cluster fix 10.0.0.1:6379
```

This attempts to resolve slot configuration errors and open slots.

## Calling Commands on All Nodes

```bash
redis-cli --cluster call 10.0.0.1:6379 CONFIG GET maxmemory
```

Output shows the result from each node in the cluster.

## Summary

`redis-cli --cluster` provides a complete toolkit for Redis Cluster lifecycle management - from creation to resharding to node removal. Use `check` for health audits, `reshard` for slot migrations, and `rebalance` to equalize load across primaries.
