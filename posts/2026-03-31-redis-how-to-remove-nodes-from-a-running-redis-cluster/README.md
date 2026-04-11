# How to Remove Nodes from a Running Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Operation, Node Management, Scaling

Description: A step-by-step guide to safely removing primary and replica nodes from a running Redis Cluster, including slot migration and cluster cleanup.

---

## When to Remove Nodes

Remove nodes from a Redis Cluster when:

- Downsizing infrastructure to reduce costs
- Replacing hardware or migrating servers
- Decommissioning old nodes after capacity planning changes
- Consolidating under-utilized primaries

**Important:** Never remove nodes abruptly. Always migrate data first to avoid data loss.

## Overview of the Process

1. If removing a primary, migrate its hash slots to other nodes first
2. Remove replica nodes first (no migration needed)
3. Use `del-node` to cleanly detach the node from the cluster
4. Shut down the removed instance

## Step 1 - Identify the Node to Remove

List all cluster nodes:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES
```

Sample output:

```text
abc123 192.168.1.11:7001@17001 master - 0 ... 0-4095
def456 192.168.1.12:7002@17002 master - 0 ... 4096-8191
ghi789 192.168.1.13:7003@17003 master - 0 ... 8192-12287
jkl012 192.168.1.17:7006@17006 master - 0 ... 12288-16383
```

Note the node ID you want to remove.

## Step 2 - Remove a Replica Node

Replica nodes hold no hash slots, so they can be removed directly:

```bash
redis-cli --cluster del-node \
  192.168.1.11:7001 \
  <replica-node-id> \
  -a clusterPassword
```

The node is detached from the cluster. You can then shut it down:

```bash
redis-cli -h 192.168.1.17 -p 7007 -a clusterPassword SHUTDOWN
```

## Step 3 - Migrate Slots from a Primary Node

Before removing a primary, migrate all its slots to other nodes. Use `reshard`:

```bash
redis-cli --cluster reshard \
  192.168.1.11:7001 \
  -a clusterPassword
```

When prompted:

- **Number of slots to move:** Enter the total slots owned by the node to remove (e.g., 4096)
- **Receiving node ID:** Choose a destination node ID (or distribute across multiple nodes)
- **Source node IDs:** Enter the ID of the node to remove, then type `done`

```text
How many slots do you want to move? 4096
Receiving node ID: abc123
Source node #1: jkl012
Source node #2: done
Do you want to proceed? yes
```

Repeat for each destination if you want to spread slots evenly:

```bash
# First: move 2048 slots to node abc123
# Then: move 2048 slots to node def456
```

Or use `rebalance` to redistribute automatically after removing the node's slots:

```bash
redis-cli --cluster rebalance \
  192.168.1.11:7001 \
  -a clusterPassword
```

## Step 4 - Verify Slots Are Empty

After migration, confirm the node has no assigned slots:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES | grep <node-id>
```

The slot range column should be empty or show only migrating states. You can also check the node itself by looking at its own entry in `CLUSTER NODES`:

```bash
redis-cli -h 192.168.1.17 -p 7006 -a clusterPassword CLUSTER NODES | grep myself
```

The output should show the node's own entry with no slot ranges at the end:

```text
jkl012 192.168.1.17:7006@17006 myself,master - 0 0 0 connected
```

## Step 5 - Remove the Empty Primary Node

Once the node has no slots, remove it from the cluster:

```bash
redis-cli --cluster del-node \
  192.168.1.11:7001 \
  <primary-node-id> \
  -a clusterPassword
```

Output:

```text
>>> Removing node <node-id> from cluster 192.168.1.11:7001
>>> Sending CLUSTER FORGET messages to the cluster...
>>> SHUTDOWN the node.
```

The `del-node` command also shuts down the removed instance.

## Step 6 - Clean Up Remaining Nodes

After removal, existing nodes should automatically forget the removed node. Verify:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES | grep <removed-node-id>
```

No output means the node has been successfully removed from all cluster node tables.

Check cluster health:

```bash
redis-cli --cluster check 192.168.1.11:7001 -a clusterPassword
```

Expected:

```text
[OK] All nodes agree about slots configuration.
[OK] All 16384 slots covered.
```

## Handling a Node That Is Already Down

If the node you want to remove is offline (crashed), you cannot use `del-node` normally. Use `CLUSTER FORGET` manually on each remaining node:

```bash
NODE_ID="<dead-node-id>"

for HOST_PORT in \
  "192.168.1.11:7001" \
  "192.168.1.12:7002" \
  "192.168.1.13:7003"; do
  HOST=$(echo $HOST_PORT | cut -d: -f1)
  PORT=$(echo $HOST_PORT | cut -d: -f2)
  redis-cli -h $HOST -p $PORT -a clusterPassword CLUSTER FORGET $NODE_ID
done
```

Note: `CLUSTER FORGET` only suppresses the node for 60 seconds by default. Run it quickly on all nodes.

## Summary

Removing nodes from a Redis Cluster requires migrating hash slots to other nodes before removal. For replicas, deletion is immediate with `del-node`. For primaries, use `reshard` to drain all slots first, then `del-node` to cleanly detach. Always verify cluster health with `cluster check` after removal to confirm all 16384 slots remain covered and the cluster state is `ok`.
