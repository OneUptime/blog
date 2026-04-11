# Redis Cluster Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Command, Cheat Sheet, Scaling

Description: Complete Redis cluster commands reference covering CLUSTER INFO, CLUSTER NODES, slot management, node operations, and failover commands.

---

Redis Cluster distributes data across multiple nodes using 16384 hash slots. Here is the complete reference for cluster management commands.

## Cluster Information

```bash
# Cluster status and configuration
CLUSTER INFO

# List all nodes in the cluster
CLUSTER NODES

# Get this node's unique ID
CLUSTER MYID

# Get cluster configuration epoch (run from shell)
redis-cli CLUSTER INFO | grep cluster_current_epoch
```

## Hash Slot Management

```bash
# Find which slot a key belongs to
CLUSTER KEYSLOT user:42           # returns slot number (0-16383)

# Count keys in a slot
CLUSTER COUNTKEYSINSLOT 7638

# Get key names in a slot (up to N)
CLUSTER GETKEYSINSLOT 7638 10

# Assign slots to current node
CLUSTER ADDSLOTS 0 1 2 3 4

# Add a range of slots (Redis 7.0+)
CLUSTER ADDSLOTSRANGE 0 1000

# Remove slots from current node
CLUSTER DELSLOTS 0 1 2

# Remove slot range (Redis 7.0+)
CLUSTER DELSLOTSRANGE 0 1000

# Mark all slots as unassigned on this node
CLUSTER FLUSHSLOTS
```

## Node Management

```bash
# Add a new node (meet another node)
CLUSTER MEET 192.168.1.101 7001

# Remove a node from the cluster
CLUSTER FORGET <node-id>

# Make this node a replica of another
CLUSTER REPLICATE <primary-node-id>

# Reset cluster state (HARD or SOFT)
CLUSTER RESET SOFT    # keep node ID
CLUSTER RESET HARD    # generate new node ID
```

## Failover

```bash
# Trigger manual failover (run on a replica)
CLUSTER FAILOVER

# Force failover even if primary is unreachable
CLUSTER FAILOVER FORCE

# Takeover without coordination (emergency only)
CLUSTER FAILOVER TAKEOVER
```

## Slot Migration

When resharding, slots move between nodes through these states:

```bash
# On the destination node: mark slot as importing from source
CLUSTER SETSLOT <slot> IMPORTING <source-node-id>

# On the source node: mark slot as migrating to destination
CLUSTER SETSLOT <slot> MIGRATING <dest-node-id>

# Migrate a key to another node
MIGRATE 192.168.1.102 7002 user:42 0 5000

# Mark slot as assigned to a node (complete migration)
CLUSTER SETSLOT <slot> NODE <dest-node-id>
```

Use `redis-cli --cluster reshard` to automate the full resharding process:

```bash
redis-cli --cluster reshard 127.0.0.1:7000 \
  --cluster-from <source-node-id> \
  --cluster-to <dest-node-id> \
  --cluster-slots 1000 \
  --cluster-yes
```

## Cluster Health Check

```bash
# Check cluster from outside
redis-cli --cluster check 127.0.0.1:7000

# Fix cluster issues automatically
redis-cli --cluster fix 127.0.0.1:7000

# View cluster info summary
redis-cli --cluster info 127.0.0.1:7000
```

## CLUSTER LINKS

```bash
# View inter-node TCP connections (Redis 7.0+)
CLUSTER LINKS
```

## Key Rules in Cluster Mode

```bash
# Keys with the same hash tag go to the same slot
MSET {user:42}:profile "..." {user:42}:sessions "..."  # allowed

# Multi-key operations require same slot
MSET key1 "a" key2 "b"   # may fail if keys are on different slots
```

## Summary

Redis Cluster commands manage node membership, slot assignment, failover, and slot migration. The CLUSTER KEYSLOT command helps debug which node a key belongs to, and CLUSTER INFO shows the cluster health. Use redis-cli --cluster commands for safe automated resharding and health checks.
