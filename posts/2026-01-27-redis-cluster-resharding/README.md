# How to Configure Redis Cluster Resharding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, Resharding, Scaling, Hash Slots, DevOps

Description: Learn how to reshard Redis Cluster to redistribute hash slots, add or remove nodes, and rebalance data without downtime.

---

> Redis Cluster distributes data across nodes using hash slots. When you add or remove nodes, resharding moves slots between nodes to balance your data. Done right, this happens with zero downtime.

## Redis Cluster Architecture Basics

Redis Cluster uses a shared-nothing architecture where data is automatically partitioned across multiple nodes. Each node holds a subset of the total data and can communicate with every other node.

```
+------------------+     +------------------+     +------------------+
|   Master Node 1  |     |   Master Node 2  |     |   Master Node 3  |
|  Slots: 0-5460   |     | Slots: 5461-10922|     |Slots: 10923-16383|
+------------------+     +------------------+     +------------------+
        |                        |                        |
+------------------+     +------------------+     +------------------+
|   Replica Node 1 |     |   Replica Node 2 |     |   Replica Node 3 |
+------------------+     +------------------+     +------------------+
```

## Understanding Hash Slots

Redis Cluster has exactly 16,384 hash slots. Every key belongs to one slot, determined by:

```bash
# Hash slot calculation
SLOT = CRC16(key) mod 16384
```

When you run a command, Redis computes the slot and routes it to the correct node. For multi-key operations, all keys must be in the same slot (use hash tags like `{user}:profile` and `{user}:orders`).

## When to Reshard

Reshard your cluster when:

- Adding new nodes to increase capacity
- Removing nodes to reduce costs
- Rebalancing after uneven key distribution
- Preparing for maintenance on specific nodes
- Scaling before expected traffic spikes

## Checking Current Slot Distribution

Before resharding, understand your current state:

```bash
# Connect to any cluster node and check slot distribution
redis-cli -c -h 192.168.1.10 -p 7000 cluster slots

# Get a summary of nodes and their slots
redis-cli -c -h 192.168.1.10 -p 7000 cluster nodes

# Check cluster info
redis-cli -c -h 192.168.1.10 -p 7000 cluster info
```

Example output from `cluster nodes`:

```
a1b2c3d4... 192.168.1.10:7000@17000 master - 0 0 1 connected 0-5460
e5f6g7h8... 192.168.1.11:7001@17001 master - 0 0 2 connected 5461-10922
i9j0k1l2... 192.168.1.12:7002@17002 master - 0 0 3 connected 10923-16383
```

## Adding a New Node to the Cluster

### Step 1: Start the New Node

```bash
# Create configuration for new node
cat > /etc/redis/7003.conf << EOF
port 7003
cluster-enabled yes
cluster-config-file nodes-7003.conf
cluster-node-timeout 5000
appendonly yes
dir /var/lib/redis/7003
EOF

# Start the new Redis instance
redis-server /etc/redis/7003.conf
```

### Step 2: Add Node to Cluster

```bash
# Add new node (192.168.1.13:7003) to cluster via existing node
redis-cli --cluster add-node \
    192.168.1.13:7003 \
    192.168.1.10:7000
```

At this point, the new node is part of the cluster but holds zero slots.

### Step 3: Reshard Slots to New Node

```bash
# Interactive resharding - moves slots to the new node
redis-cli --cluster reshard 192.168.1.10:7000

# You will be prompted:
# How many slots do you want to move? 4096
# What is the receiving node ID? <new-node-id>
# Source node IDs: all (to take from all existing masters)
```

For automated resharding:

```bash
# Get the new node ID
NEW_NODE_ID=$(redis-cli -h 192.168.1.13 -p 7003 cluster myid)

# Reshard 4096 slots to new node from all sources
redis-cli --cluster reshard 192.168.1.10:7000 \
    --cluster-from all \
    --cluster-to $NEW_NODE_ID \
    --cluster-slots 4096 \
    --cluster-yes
```

## Removing a Node from the Cluster

### Step 1: Reshard Slots Away

Before removing a node, move all its slots to other nodes:

```bash
# Get the node ID to remove
REMOVE_NODE_ID=$(redis-cli -h 192.168.1.13 -p 7003 cluster myid)

# Get a target node ID (any other master)
TARGET_NODE_ID=$(redis-cli -h 192.168.1.10 -p 7000 cluster myid)

# Count slots on the node to remove
SLOT_COUNT=$(redis-cli -h 192.168.1.13 -p 7003 cluster info | grep cluster_slots_assigned | cut -d: -f2 | tr -d '\r')

# Move all slots to target node
redis-cli --cluster reshard 192.168.1.10:7000 \
    --cluster-from $REMOVE_NODE_ID \
    --cluster-to $TARGET_NODE_ID \
    --cluster-slots $SLOT_COUNT \
    --cluster-yes
```

### Step 2: Remove the Empty Node

```bash
# Remove the node after slots are moved
redis-cli --cluster del-node \
    192.168.1.10:7000 \
    $REMOVE_NODE_ID
```

## Rebalancing Slots Across Nodes

If slots become unevenly distributed, rebalance them:

```bash
# Automatic rebalancing - distributes slots evenly
redis-cli --cluster rebalance 192.168.1.10:7000

# Rebalance with specific weights (node1 gets 2x slots of others)
redis-cli --cluster rebalance 192.168.1.10:7000 \
    --cluster-weight $NODE1_ID=2 $NODE2_ID=1 $NODE3_ID=1

# Use thresholds to avoid unnecessary moves
# Only rebalance if a node differs by more than 2% from ideal
redis-cli --cluster rebalance 192.168.1.10:7000 \
    --cluster-threshold 2

# Simulate rebalancing without making changes
redis-cli --cluster rebalance 192.168.1.10:7000 \
    --cluster-simulate
```

## Monitoring Resharding Progress

### Watch Slot Migration

```bash
# Monitor cluster state during resharding
watch -n 1 'redis-cli -c -h 192.168.1.10 -p 7000 cluster nodes | grep -E "master|myself"'

# Check for migrating/importing slots
redis-cli -h 192.168.1.10 -p 7000 cluster nodes | grep -E "\[.*->.*\]|\[.*<-.*\]"
```

### Check Resharding Status

```bash
# Count slots per node
redis-cli --cluster check 192.168.1.10:7000

# Output shows:
# - Slots per node
# - Keys per node
# - Replication status
# - Any issues detected
```

### Monitor Key Migration

```bash
# Watch keys being migrated in real-time
redis-cli -h 192.168.1.10 -p 7000 monitor | grep -i migrate
```

## Handling Resharding Failures

### Fixing Stuck Migrations

If resharding fails mid-way, slots can be stuck in migrating state:

```bash
# Check for slots in migrating/importing state
redis-cli --cluster check 192.168.1.10:7000

# Fix stuck slots automatically
redis-cli --cluster fix 192.168.1.10:7000

# If automatic fix fails, manually clear the state
# On the source node:
redis-cli -h 192.168.1.10 -p 7000 cluster setslot <slot> stable

# On the target node:
redis-cli -h 192.168.1.11 -p 7001 cluster setslot <slot> stable
```

### Recovering from Node Failures During Resharding

```bash
# If a node fails during resharding:

# 1. Wait for failover to replica (if configured)
redis-cli -h 192.168.1.10 -p 7000 cluster info | grep cluster_state

# 2. Check cluster health
redis-cli --cluster check 192.168.1.10:7000

# 3. Fix any slot inconsistencies
redis-cli --cluster fix 192.168.1.10:7000

# 4. Resume resharding from where it stopped
redis-cli --cluster reshard 192.168.1.10:7000
```

### Dealing with Timeout Errors

```bash
# Increase timeout for large migrations
redis-cli --cluster reshard 192.168.1.10:7000 \
    --cluster-timeout 60000 \
    --cluster-from $SOURCE_ID \
    --cluster-to $TARGET_ID \
    --cluster-slots 1000 \
    --cluster-yes

# Use smaller batch sizes for busy clusters
redis-cli --cluster reshard 192.168.1.10:7000 \
    --cluster-pipeline 100 \
    --cluster-from $SOURCE_ID \
    --cluster-to $TARGET_ID \
    --cluster-slots 1000 \
    --cluster-yes
```

## Resharding Script for Automation

```bash
#!/bin/bash
# reshard-cluster.sh - Safely reshard Redis Cluster

set -e

CLUSTER_HOST=${1:-"192.168.1.10"}
CLUSTER_PORT=${2:-"7000"}
TARGET_NODE=${3}
SLOTS_TO_MOVE=${4:-"1000"}

# Validate inputs
if [ -z "$TARGET_NODE" ]; then
    echo "Usage: $0 <cluster-host> <cluster-port> <target-node-id> [slots]"
    exit 1
fi

echo "=== Pre-resharding check ==="
redis-cli --cluster check $CLUSTER_HOST:$CLUSTER_PORT

echo "=== Current slot distribution ==="
redis-cli -c -h $CLUSTER_HOST -p $CLUSTER_PORT cluster nodes | grep master

echo "=== Starting resharding ==="
echo "Moving $SLOTS_TO_MOVE slots to $TARGET_NODE"

redis-cli --cluster reshard $CLUSTER_HOST:$CLUSTER_PORT \
    --cluster-from all \
    --cluster-to $TARGET_NODE \
    --cluster-slots $SLOTS_TO_MOVE \
    --cluster-yes \
    --cluster-timeout 30000

echo "=== Post-resharding check ==="
redis-cli --cluster check $CLUSTER_HOST:$CLUSTER_PORT

echo "=== New slot distribution ==="
redis-cli -c -h $CLUSTER_HOST -p $CLUSTER_PORT cluster nodes | grep master

echo "=== Resharding complete ==="
```

## Best Practices

1. **Always check cluster health first** - Run `redis-cli --cluster check` before and after resharding

2. **Reshard during low-traffic periods** - Migration uses CPU and network bandwidth

3. **Move slots in small batches** - Avoid moving thousands of slots at once

4. **Monitor memory usage** - Target nodes need memory for incoming keys

5. **Keep replicas in sync** - Ensure replicas are caught up before removing masters

6. **Test in staging first** - Practice resharding procedures before production

7. **Document your topology** - Keep records of which nodes hold which slots

8. **Set appropriate timeouts** - Increase timeouts for large slot ranges

9. **Have a rollback plan** - Know how to reverse slot movements if needed

10. **Monitor application errors** - Watch for increased latency or timeouts during resharding

## Quick Reference

| Task | Command |
|------|---------|
| Check cluster | `redis-cli --cluster check host:port` |
| Add node | `redis-cli --cluster add-node new:port existing:port` |
| Remove node | `redis-cli --cluster del-node host:port node-id` |
| Reshard | `redis-cli --cluster reshard host:port` |
| Rebalance | `redis-cli --cluster rebalance host:port` |
| Fix issues | `redis-cli --cluster fix host:port` |

---

Redis Cluster resharding enables horizontal scaling without downtime. By understanding hash slots and following proper procedures, you can safely add capacity, remove nodes, and keep your data balanced. For monitoring your Redis Cluster health and resharding operations, consider using [OneUptime](https://oneuptime.com) to track metrics, set up alerts, and ensure your cluster stays healthy.
