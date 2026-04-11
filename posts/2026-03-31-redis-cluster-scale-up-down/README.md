# How to Scale Redis Cluster Up and Down

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Scaling, Sharding, Operation

Description: Learn how to add and remove shards from a running Redis Cluster, including slot migration and safe node removal procedures.

---

Redis Cluster supports horizontal scaling - you can add new primary nodes (scale out) or remove primaries (scale in) while the cluster remains online. The key operation is resharding hash slots between nodes.

## Scaling Up - Adding a New Shard

### Step 1 - Prepare the New Node

```bash
# redis.conf for new node
port 7007
cluster-enabled yes
cluster-config-file nodes-7007.conf
cluster-node-timeout 5000
appendonly yes
```

Start it:

```bash
redis-server /etc/redis/cluster/7007/redis.conf
```

### Step 2 - Add to Cluster

```bash
redis-cli --cluster add-node new-host:7007 existing-host:7001
```

The new node joins with no slots. Verify:

```bash
redis-cli -p 7001 CLUSTER NODES | grep 7007
# Should appear as master with "connected" but no slots listed
```

### Step 3 - Migrate Slots to the New Node

Get the new node's ID:

```bash
NEW_NODE_ID=$(redis-cli -p 7001 CLUSTER NODES | grep 7007 | awk '{print $1}')
```

Reshard 4000 slots from existing nodes to the new node:

```bash
redis-cli --cluster reshard existing-host:7001 \
  --cluster-from all \
  --cluster-to $NEW_NODE_ID \
  --cluster-slots 4000 \
  --cluster-yes
```

This migrates keys live without downtime using the `MIGRATE` command internally.

### Step 4 - Add a Replica for the New Primary

```bash
redis-server /etc/redis/cluster/7008/redis.conf  # Start replica node

redis-cli --cluster add-node new-host:7008 existing-host:7001 \
  --cluster-slave \
  --cluster-master-id $NEW_NODE_ID
```

### Verify the New Shard

```bash
redis-cli -p 7001 CLUSTER NODES | grep -E "7007|7008"
redis-cli -p 7001 CLUSTER INFO | grep cluster_slots_assigned
# Should still be 16384
```

## Scaling Down - Removing a Shard

### Step 1 - Empty the Node's Slots

Move all slots from the node to be removed to other nodes:

```bash
# Get the node ID of the node to remove
REMOVE_ID=$(redis-cli -p 7001 CLUSTER NODES | grep 7003 | awk '{print $1}')

# Reshard all its slots away
redis-cli --cluster reshard existing-host:7001 \
  --cluster-from $REMOVE_ID \
  --cluster-to other-node-id \
  --cluster-slots 5461 \
  --cluster-yes
# Adjust --cluster-slots to match however many slots the node owns
```

After resharding, verify the node has no slots:

```bash
redis-cli -p 7001 CLUSTER NODES | grep 7003
# Should show: master - ... connected (no slot range)
```

### Step 2 - Remove Replicas First

```bash
# Get replica IDs for this primary
redis-cli -p 7001 CLUSTER NODES | grep $REMOVE_ID | head

# Remove each replica
redis-cli --cluster del-node existing-host:7001 REPLICA_NODE_ID
```

### Step 3 - Remove the Empty Primary

```bash
redis-cli --cluster del-node existing-host:7001 $REMOVE_ID
```

### Step 4 - Stop the Node

```bash
redis-cli -h host-to-remove -p 7003 SHUTDOWN SAVE
```

## Monitoring During Scaling

```bash
# Watch slot migration progress
watch -n 2 "redis-cli -p 7001 CLUSTER INFO | grep cluster_slots"

# Check cluster health
redis-cli --cluster check existing-host:7001
```

## Summary

Scale Redis Cluster up by adding new nodes and using `--cluster reshard` to migrate slots to them. Scale down by resharding all slots away from the node to remove, deleting its replicas first, then deleting the empty primary. Both operations are live - the cluster serves traffic throughout the migration.
