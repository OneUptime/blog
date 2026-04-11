# How to Use CLUSTER MYID in Redis to Get Node ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, CLUSTER MYID, Node Management, Operation

Description: Learn how to use CLUSTER MYID in Redis to retrieve the unique 40-character node ID of the current node, which is required for CLUSTER REPLICATE, CLUSTER FORGET, and other cluster management...

---

## Overview

`CLUSTER MYID` returns the unique 40-character hexadecimal identifier of the node you are connected to. Every Redis Cluster node has a persistent ID that does not change unless the node is reset with `CLUSTER RESET HARD`. This ID is used throughout cluster management commands including `CLUSTER REPLICATE`, `CLUSTER FORGET`, and resharding operations.

## Syntax

```redis
CLUSTER MYID
```

Returns a 40-character hex string.

## Basic Usage

```redis
CLUSTER MYID
```

```text
"a1b2c3d4e5f6789012345678901234567890abcd"
```

## When You Need the Node ID

### Before running CLUSTER REPLICATE

When configuring replication, you need the primary's node ID:

```bash
# Get the primary's node ID
PRIMARY_ID=$(redis-cli -h 192.168.1.10 -p 7001 CLUSTER MYID)
echo "Primary ID: $PRIMARY_ID"

# Connect to the replica node and set its primary
redis-cli -h 192.168.1.10 -p 7004 CLUSTER REPLICATE $PRIMARY_ID
```

### Before running CLUSTER FORGET

When removing a node, you need its ID to broadcast `CLUSTER FORGET`:

```bash
# Get the ID of the node being removed
REMOVE_ID=$(redis-cli -h 192.168.1.13 -p 7007 CLUSTER MYID)
echo "Removing node: $REMOVE_ID"

# Forget from all remaining nodes
for port in 7001 7002 7003 7004 7005 7006; do
  redis-cli -p $port CLUSTER FORGET $REMOVE_ID
done
```

### Before resharding

When scripting non-interactive resharding, you need the destination node's ID:

```bash
# Get the new node's ID
DEST_ID=$(redis-cli -h 192.168.1.13 -p 7007 CLUSTER MYID)

# Reshard 1365 slots to the new node
redis-cli --cluster reshard 192.168.1.10:7001 \
  --cluster-to $DEST_ID \
  --cluster-from all \
  --cluster-slots 1365 \
  --cluster-yes
```

## CLUSTER MYID vs CLUSTER NODES

| Command | Scope | Returns |
|---------|-------|---------|
| `CLUSTER MYID` | Current node only | 40-char node ID |
| `CLUSTER NODES` | All known nodes | Full topology including all IDs |

`CLUSTER MYID` is faster and simpler when you only need one node's ID.

## Node ID Persistence

The node ID is stored in the cluster configuration file (e.g., `nodes-7001.conf`) and persists across restarts. It only changes if:

1. `CLUSTER RESET HARD` is issued
2. The cluster configuration file is deleted

```redis
# After restart, ID is the same
CLUSTER MYID
```

```text
"a1b2c3d4e5f6789012345678901234567890abcd"
```

```redis
# After CLUSTER RESET HARD, ID changes
CLUSTER RESET HARD
CLUSTER MYID
```

```text
"b2c3d4e5f6a789012345678901234567890abcde"
```

## Finding a Node's ID Without Connecting to It

If you cannot connect to the node directly, find its ID from any other cluster member:

```redis
CLUSTER NODES
```

```text
a1b2c3d4e5f6789012345678901234567890abcd 192.168.1.10:7001@17001 master - 0 1711900000000 1 connected 0-5460
...
```

The first field on each line is the node ID.

## Scripting with CLUSTER MYID

```bash
#!/bin/bash
# Print a summary of all cluster nodes with their IDs and roles

CLUSTER_NODES="192.168.1.10:7001 192.168.1.11:7002 192.168.1.12:7003"

for node in $CLUSTER_NODES; do
  HOST=$(echo $node | cut -d: -f1)
  PORT=$(echo $node | cut -d: -f2)
  ID=$(redis-cli -h $HOST -p $PORT CLUSTER MYID)
  echo "Node $HOST:$PORT -> ID: $ID"
done
```

## Summary

`CLUSTER MYID` returns the unique 40-character node ID of the current Redis Cluster node. This ID is required as an argument to `CLUSTER REPLICATE`, `CLUSTER FORGET`, and resharding commands. The ID persists across restarts and only changes after `CLUSTER RESET HARD`. Use `CLUSTER MYID` in scripts to programmatically retrieve node IDs rather than parsing `CLUSTER NODES` output, especially when you need just one specific node's ID.
