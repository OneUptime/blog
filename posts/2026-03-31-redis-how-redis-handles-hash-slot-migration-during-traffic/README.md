# How Redis Handles Hash Slot Migration During Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Hash Slot

Description: Understand how Redis Cluster migrates hash slots between nodes while serving live traffic - including MOVED, ASK redirects, and migration safety mechanisms.

---

Redis Cluster distributes data across 16384 hash slots. When you add or remove nodes, or rebalance the cluster, slots must be migrated between nodes. Redis handles this without stopping service, but the migration process has important behavior that developers and operators need to understand.

## How Slot Migration Works

Migration moves keys from one node (source) to another (destination) one at a time. The process uses these states:

- `MIGRATING` - the source node is moving a slot to another node
- `IMPORTING` - the destination node is receiving a slot from another node

```bash
redis-cli CLUSTER SETSLOT 1234 MIGRATING <destination-node-id>
redis-cli CLUSTER SETSLOT 1234 IMPORTING <source-node-id>
```

## MOVED vs ASK Redirects

While a slot is migrating, clients may get redirected. There are two types:

**MOVED** - the slot has permanently moved to another node. Update your routing table:

```text
-MOVED 1234 192.168.1.2:6379
```

**ASK** - the key was not found on this node and may have already migrated. Try the destination node for this one request:

```text
-ASK 1234 192.168.1.2:6379
```

Smart Redis clients handle these transparently. In Python with redis-py:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)
rc.set("mykey", "value")  # Follows MOVED/ASK automatically
```

## How Keys Are Transferred

The `MIGRATE` command moves a key from the source to the destination atomically:

```bash
redis-cli -h source-node MIGRATE dest-host 6379 mykey 0 5000
```

During migration, if a client requests a key that still exists on the source, the source serves it normally. If the key has already moved, the source returns an ASK redirect.

## Monitoring Migration Progress

Check which slots are currently migrating:

```bash
redis-cli CLUSTER NODES | grep -E "\->-|-<-"
```

Use the cluster check tool:

```bash
redis-cli --cluster check <any-node>:6379
```

## Impact on Latency

Slot migration increases latency slightly for affected keys due to MIGRATE operations. The impact is proportional to the number of keys being migrated and their size. Avoid migrating during peak traffic.

## Completing Migration

After all keys are moved, finalize the migration:

```bash
redis-cli CLUSTER SETSLOT 1234 NODE <destination-node-id>
```

Run this on all cluster nodes to propagate the slot assignment.

## Using the Built-in Reshard Tool

Instead of manual steps, use the built-in reshard command:

```bash
redis-cli --cluster reshard <any-node>:6379
```

Follow the interactive prompts to specify how many slots to move and which nodes to involve.

## Summary

Redis Cluster handles hash slot migration during live traffic by temporarily marking slots as MIGRATING and IMPORTING, using ASK redirects for in-progress keys, and only issuing MOVED after migration completes. Smart client libraries handle these redirects automatically, making live slot migration transparent to most applications.
