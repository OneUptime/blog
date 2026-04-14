# How to Use CLUSTER RESET in Redis to Reset a Cluster Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Reset, Operation, Maintenance

Description: Learn how to use CLUSTER RESET in Redis to reset a node's cluster state, remove it from the cluster, and prepare it for reuse or redeployment.

---

## What Is CLUSTER RESET?

`CLUSTER RESET` is a Redis Cluster command that resets a node's cluster-related state. Depending on the reset type (HARD or SOFT), it clears the node ID, removes all known nodes from the cluster table, clears slot assignments, and deletes cluster-related data. It is used when decommissioning a node, rebuilding a cluster, or recovering from a misconfiguration.

## Basic Syntax

```text
CLUSTER RESET [HARD | SOFT]
```

- `SOFT` (default) - clears slot assignments and flushes the nodes table, but keeps the node ID
- `HARD` - generates a new node ID, clears all cluster state, and resets configuration epoch

## SOFT Reset

A SOFT reset retains the node ID but removes its knowledge of other nodes and clears slot ownership.

```bash
redis-cli -h 127.0.0.1 -p 7001 CLUSTER RESET SOFT
# Returns: OK
```

After a SOFT reset, the node behaves as if it just started and has no knowledge of the cluster.

## HARD Reset

A HARD reset generates a completely new node ID in addition to clearing all state.

```bash
redis-cli -h 127.0.0.1 -p 7001 CLUSTER RESET HARD
# Returns: OK
```

Use HARD reset when you need to completely disassociate a node from any cluster history.

## What Happens During a Reset

| Action | SOFT | HARD |
|---|---|---|
| Clear known nodes table | Yes | Yes |
| Clear slot assignments | Yes | Yes |
| Flush cluster state | Yes | Yes |
| Turn replica into empty master (data flushed) | Yes | Yes |
| Generate new node ID | No | Yes |
| Reset config epoch to 0 | No | Yes |

Note: If the node is a replica, `CLUSTER RESET` flushes its dataset and promotes it to an empty master. For master nodes, the command does not flush data - in fact, it **refuses to run on a master that holds any keys**. You must run `FLUSHALL` on the master first, then execute `CLUSTER RESET`.

## Typical Use Cases

### Decommissioning a Node

Before removing a node from a cluster permanently, migrate its slots to other nodes, then reset:

```bash
# 1. First migrate slots away (using reshard)
redis-cli --cluster reshard 127.0.0.1:7001 \
  --cluster-from <node-id> \
  --cluster-to <target-node-id> \
  --cluster-slots 5461 \
  --cluster-yes

# 2. Remove the node from the cluster view on other nodes
redis-cli -h 127.0.0.1 -p 7002 CLUSTER FORGET <node-id>

# 3. Reset the node itself
redis-cli -h 127.0.0.1 -p 7001 CLUSTER RESET HARD
```

### Rebuilding a Cluster from Scratch

```bash
# Reset all nodes to clean state
for port in 7001 7002 7003 7004 7005 7006; do
  redis-cli -h 127.0.0.1 -p $port CLUSTER RESET HARD
done

# Now recreate the cluster
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1 --cluster-yes
```

### Repurposing a Replica

If you want to detach a replica from its master and reuse it as a standalone instance:

```bash
# Reset the replica
redis-cli -h 127.0.0.1 -p 7004 CLUSTER RESET SOFT

# Verify it has no master association
redis-cli -h 127.0.0.1 -p 7004 CLUSTER NODES | grep myself
```

## Important Cautions

- `CLUSTER RESET` **will not execute** on a master node that holds any keys. You must run `FLUSHALL` first, then reset. Always migrate slots away from master nodes before resetting to avoid data loss
- Running HARD reset on a node that other nodes still reference will leave stale entries in other nodes' views until `CLUSTER FORGET` is called
- If the node is a replica, `CLUSTER RESET` flushes its dataset and converts it into an empty master. For master nodes (after keys are removed), cluster state is cleared but the empty keyspace is preserved

## Python Example

```python
import redis

# Reset a node (e.g., after removing it from the cluster)
r = redis.Redis(host='127.0.0.1', port=7001, decode_responses=True)

# Soft reset
r.cluster('reset', 'soft')

# Hard reset
r.cluster('reset', 'hard')

# Verify it has no cluster knowledge
nodes = r.cluster('nodes')
print(f"Known nodes after reset: {len(nodes)}")  # Should be 1 (itself)
```

## Summary

`CLUSTER RESET` is an essential maintenance command for Redis Cluster operations, used to cleanly remove a node from cluster state during decommissioning, rebuilding, or repurposing. Use SOFT reset to preserve the node ID while clearing cluster membership, and HARD reset for a complete clean slate including a new node ID. Always migrate slots away from master nodes before resetting to avoid data loss.
