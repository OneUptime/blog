# Redis Cluster Design Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Design, Architecture, Best Practice

Description: Learn how to design a Redis Cluster for production - covering shard count, replica placement, key distribution, cross-slot operations, and capacity planning.

---

Redis Cluster distributes data across multiple nodes using hash slot partitioning. A well-designed cluster is scalable, resilient, and maintainable. Poor design choices made early are expensive to fix later. This guide covers the key design decisions for production Redis clusters.

## Understand Hash Slot Distribution

Redis Cluster uses 16,384 hash slots distributed across primary nodes. Each key maps to a slot:

```bash
# Find the slot for a key
redis-cli CLUSTER KEYSLOT mykey
# Output: 14687

# Check slot-to-node mapping
redis-cli CLUSTER SLOTS
```

With 3 primary nodes, each gets roughly 5,461 slots. Uneven key distribution can cause hotspot nodes.

## Choose the Right Number of Shards

Start with the minimum needed and plan for growth:

```text
Dataset size: 30GB
Target per-node: 10GB (with 30% headroom)
Primary nodes needed: 3
Replicas per primary: 1-2
Total nodes: 6-9
```

Avoid creating more than 1,000 nodes. Each node communicates with all others via the gossip protocol, creating O(n) overhead.

## Place Replicas in Different Availability Zones

For high availability, distribute replicas across AZs:

```bash
# Check current replica placement
redis-cli CLUSTER NODES | grep slave

# Move a replica to a specific node
redis-cli CLUSTER REPLICATE <new-primary-node-id>
```

Never place a primary and its replica in the same AZ or rack. A zone failure should not take down both.

## Use Hash Tags for Related Keys

Keys with related data that you need in the same slot should use hash tags:

```bash
# Without hash tags, these may end up on different nodes
SET user:1:profile "..."
SET user:1:session "..."

# With hash tags, both keys are in the same slot
SET {user:1}:profile "..."
SET {user:1}:session "..."
```

Only the part inside `{}` is used for slot calculation. This allows multi-key operations like `MGET` and transactions.

## Avoid Cross-Slot Operations

Commands operating on multiple keys fail if the keys span different slots:

```bash
# This will fail if key1 and key2 are on different slots
MGET key1 key2
# Error: CROSSSLOT Keys in request don't hash to the same slot
```

Design your data model to avoid cross-slot operations in hot paths. Use hash tags when co-location is necessary.

## Plan for Resharding

When you add nodes, Redis Cluster can rebalance slots. Test this in staging first:

```bash
# Check slot distribution
redis-cli --cluster check redis-node1:6379

# Rebalance slots across all nodes
redis-cli --cluster rebalance redis-node1:6379 --cluster-use-empty-masters
```

Resharding moves data live but consumes CPU and network bandwidth. Schedule it during low-traffic windows.

## Configure Cluster-Aware Clients

Standard Redis clients will fail on cluster setups. Use cluster-aware clients:

```python
from redis.cluster import RedisCluster, ClusterNode

client = RedisCluster(
    startup_nodes=[
        ClusterNode("redis-node1", 6379),
        ClusterNode("redis-node2", 6379),
    ],
    decode_responses=True,
    require_full_coverage=False
)
```

The client automatically discovers all nodes and routes commands to the correct shard.

## Set Cluster Node Timeout Appropriately

```text
# redis.conf on all cluster nodes
cluster-node-timeout 15000
```

15 seconds is a safe default. Too short causes false failovers during network hiccups.

## Summary

Redis Cluster design requires careful thought about shard count, replica placement, key co-location with hash tags, and cross-slot operation avoidance. Distribute replicas across availability zones, use cluster-aware clients, and plan for resharding capacity before you hit limits. Good cluster design decisions made upfront prevent painful migrations as your dataset grows.
