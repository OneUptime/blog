# How to Use CLUSTER SETSLOT in Redis for Slot Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER SETSLOT, Slot Migration, Resharding

Description: Learn how to use CLUSTER SETSLOT in Redis to control hash slot states during live migration between cluster nodes.

---

`CLUSTER SETSLOT` is the command that orchestrates hash slot migration between nodes in a Redis Cluster. It sets a slot into one of several states - `MIGRATING`, `IMPORTING`, `STABLE`, or `NODE` - enabling live, zero-downtime resharding.

## Syntax

```text
CLUSTER SETSLOT slot MIGRATING node-id
CLUSTER SETSLOT slot IMPORTING node-id
CLUSTER SETSLOT slot STABLE
CLUSTER SETSLOT slot NODE node-id
```

## Slot States Explained

| State | Description |
|-------|-------------|
| MIGRATING | The slot is moving away from this node to another |
| IMPORTING | This node is receiving the slot from another node |
| STABLE | Clears MIGRATING or IMPORTING state without completing migration |
| NODE | Assigns the slot to the given node, completing the migration |

## Complete Migration Walkthrough

Migrating slot 500 from node A (port 7001) to node B (port 7002):

```bash
# Get node IDs
NODE_A=$(redis-cli -p 7001 CLUSTER MYID)
NODE_B=$(redis-cli -p 7002 CLUSTER MYID)

# Step 1 - Mark slot as IMPORTING on the destination
redis-cli -p 7002 CLUSTER SETSLOT 500 IMPORTING $NODE_A

# Step 2 - Mark slot as MIGRATING on the source
redis-cli -p 7001 CLUSTER SETSLOT 500 MIGRATING $NODE_B

# Step 3 - Migrate all keys in the slot
while true; do
  keys=$(redis-cli -p 7001 CLUSTER GETKEYSINSLOT 500 100)
  [ -z "$keys" ] && break
  for key in $keys; do
    redis-cli -p 7001 MIGRATE 127.0.0.1 7002 $key 0 5000
  done
done

# Step 4 - Finalize: assign slot to node B on both nodes
redis-cli -p 7001 CLUSTER SETSLOT 500 NODE $NODE_B
redis-cli -p 7002 CLUSTER SETSLOT 500 NODE $NODE_B
```

## ASK Redirections During Migration

While a slot is in MIGRATING state, clients querying keys that have already moved receive an `ASK` redirection. Well-behaved Redis clients handle this transparently. You can verify migration is active:

```bash
redis-cli -p 7001 CLUSTER NODES | grep "\->"
```

## Aborting a Migration

If you need to cancel an in-progress migration, use `STABLE`:

```bash
# Cancel on source
redis-cli -p 7001 CLUSTER SETSLOT 500 STABLE

# Cancel on destination
redis-cli -p 7002 CLUSTER SETSLOT 500 STABLE
```

Note: Any already-migrated keys remain on the destination. You may need to migrate them back manually.

## Verifying Slot State

```bash
redis-cli -p 7001 CLUSTER NODES | grep "7001"
# Shows slots with migration markers like [500->-<node-id>]
```

## Summary

`CLUSTER SETSLOT` is the core command for live slot migration in Redis Cluster. The workflow involves marking a slot as IMPORTING on the destination, MIGRATING on the source, transferring all keys, then finalizing with `NODE`. This process enables zero-downtime resharding and is what tools like `redis-cli --cluster reshard` use under the hood.
