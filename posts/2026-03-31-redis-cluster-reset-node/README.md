# How to Use CLUSTER RESET in Redis to Reset a Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, CLUSTER RESET, Operation, Node Management

Description: Learn how to use CLUSTER RESET in Redis to clear a node's cluster state, making it suitable for rejoining a cluster as a clean member or converting it back to standalone mode.

---

## Overview

`CLUSTER RESET` clears a node's cluster state, removing all known nodes, slot assignments, and the cluster configuration file. This is used when decommissioning a cluster node for reuse, recovering from a misconfiguration, or resetting a node so it can join a different cluster. It comes in two variants: `SOFT` (default) and `HARD`.

```mermaid
flowchart TD
    A[CLUSTER RESET SOFT] --> B[Clear slot assignments]
    B --> C[Forget all other nodes]
    C --> D[If replica: flush data and convert to master]

    E[CLUSTER RESET HARD] --> F[Clear slot assignments]
    F --> G[Forget all other nodes]
    G --> H[If replica: flush data and convert to master]
    H --> I[Generate new node ID]
    I --> J[Reset epochs to 0]
```

## Syntax

```redis
CLUSTER RESET [HARD | SOFT]
```

- `SOFT` (default): Clears cluster state but retains the node ID and epoch values
- `HARD`: Clears cluster state, generates a new node ID, and resets epoch values to 0

Returns `OK`.

## SOFT Reset

```redis
CLUSTER RESET SOFT
```

```text
OK
```

### Effect of SOFT reset:
- All slot assignments are cleared
- All known nodes are removed from the node table
- If the node is a replica, it is converted to an empty master (data is flushed)
- If the node is a master, existing data is retained (the command requires the master database to be empty)
- The node ID remains unchanged
- The currentEpoch and configEpoch are preserved
- The cluster configuration file (`nodes-XXXX.conf`) is updated

## HARD Reset

```redis
CLUSTER RESET HARD
```

```text
OK
```

### Effect of HARD reset:
- All slot assignments are cleared
- All known nodes are removed from the node table
- If the node is a replica, it is converted to an empty master (data is flushed)
- If the node is a master, existing data is retained (the command requires the master database to be empty)
- A new node ID is generated
- The currentEpoch and configEpoch are reset to 0
- The cluster configuration file is updated

## Restrictions

`CLUSTER RESET` cannot be issued on a master node that contains keys:

```redis
CLUSTER RESET HARD
```

```text
(error) ERR CLUSTER RESET can't be called with master nodes containing keys
```

Run `FLUSHALL` first to empty the database, then reset. Replica nodes can be reset regardless of whether they contain data, since their dataset is flushed automatically during the reset.

## Use Cases

### Repurpose a node for a different cluster

```redis
# On the node to be reset
CLUSTER RESET HARD
```

The node is now clean with a new ID and can join a different cluster via `CLUSTER MEET`.

### Recover from cluster misconfiguration

If a node has a corrupted or inconsistent cluster state:

```redis
CLUSTER RESET SOFT
```

Then re-introduce it with `CLUSTER MEET` and `CLUSTER REPLICATE`.

### Convert cluster node back to standalone

```redis
CLUSTER RESET HARD
```

Then remove `cluster-enabled yes` from `redis.conf` and restart.

## Full Reset and Rejoin Workflow

```mermaid
sequenceDiagram
    participant Admin
    participant TargetNode
    participant ClusterNode
    Admin->>TargetNode: CLUSTER RESET HARD
    TargetNode-->>Admin: OK
    Note over TargetNode: New ID, no data, no cluster state
    Admin->>ClusterNode: CLUSTER MEET <target-host> <target-port>
    ClusterNode-->>Admin: OK
    Note over TargetNode: Re-joined cluster with no slots
    Admin->>TargetNode: CLUSTER REPLICATE <primary-id>
    TargetNode-->>Admin: OK
```

```bash
# 1. Reset the node
redis-cli -h 192.168.1.13 -p 7007 CLUSTER RESET HARD

# 2. Re-introduce to cluster
redis-cli -h 192.168.1.10 -p 7001 CLUSTER MEET 192.168.1.13 7007

# 3. Set as replica of a specific primary
PRIMARY_ID=$(redis-cli -h 192.168.1.10 -p 7001 CLUSTER MYID)
redis-cli -h 192.168.1.13 -p 7007 CLUSTER REPLICATE $PRIMARY_ID
```

## Checking State After Reset

```redis
CLUSTER INFO
```

```text
cluster_enabled:1
cluster_state:ok
cluster_slots_assigned:0
cluster_known_nodes:1
cluster_size:0
```

Only the node itself is known; it has no slots and no peers yet.

## Summary

`CLUSTER RESET` clears a Redis node's cluster membership, slot assignments, and known nodes. Both `SOFT` and `HARD` modes flush data for replica nodes (converting them to empty masters). `SOFT` mode retains the node ID and epoch values. `HARD` mode generates a new node ID and resets epoch values to 0. Master nodes must be empty before the command will succeed. Use it to repurpose nodes for different clusters, recover from misconfiguration, or prepare a node for clean re-admission to a cluster. After resetting, use `CLUSTER MEET` to re-introduce the node and `CLUSTER REPLICATE` to assign it a role.
