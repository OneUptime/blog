# What Does 'ASK' Redirection Mean in Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, ASK, Resharding, Migration, Troubleshooting

Description: Learn what the Redis Cluster ASK redirection means, how it differs from MOVED, and why it occurs during slot migration when resharding a cluster.

---

## What Is the ASK Redirection

During a Redis Cluster resharding operation, while a hash slot is being migrated from one node to another, you may receive:

```text
(error) ASK 3999 10.0.0.2:6379
```

This tells the client:
- Slot **3999** is currently being migrated
- Try the command at **10.0.0.2:6379** for this specific request
- Do **not** update the slot table (unlike MOVED)

## ASK vs MOVED

The two redirections serve different purposes:

| Aspect | MOVED | ASK |
|--------|-------|-----|
| Meaning | Slot permanently owned by another node | Slot temporarily split during migration |
| Client action | Update slot cache, retry at new node | Send ASKING, retry at new node - no cache update |
| Persistence | Permanent slot ownership change | Temporary - only during migration |
| Occurs when | Slot is fully owned by the target node | Slot is partially migrated |

## When ASK Occurs

ASK occurs during `CLUSTER SETSLOT MIGRATING` state - when a slot is in the process of being moved from a source node to a target node using `redis-cli --cluster reshard` or the MIGRATE command.

During migration, some keys from that slot may still be on the source node while others have already moved to the target. When a key lookup fails on the source (because the key was already migrated), the source returns ASK to tell the client to check the target.

## How the Migration Process Works

```text
Source Node (10.0.0.1)           Target Node (10.0.0.2)
Slot 3999 MIGRATING               Slot 3999 IMPORTING

Client GET key-in-slot-3999:
  1. Client sends GET to 10.0.0.1
  2. Key is still on 10.0.0.1 -> responds normally

  (key migrated to 10.0.0.2)

  1. Client sends GET to 10.0.0.1
  2. Key is gone -> returns ASK 3999 10.0.0.2:6379
  3. Client sends ASKING to 10.0.0.2
  4. Client sends GET to 10.0.0.2
  5. Key found -> responds normally
```

## How Cluster-Aware Clients Handle ASK

When a cluster client receives ASK:

1. It sends an `ASKING` command to the target node (this tells the target to accept the command even though it is still IMPORTING)
2. It retries the original command on the target node
3. It does NOT update its slot cache (because the migration is not complete yet)

### Python (redis-py cluster)

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='10.0.0.1', port=6379)
# ASK is handled transparently during resharding
value = rc.get('mykey')
```

### Manual Handling (for educational purposes)

```python
import redis

def execute_with_ask(r, command, *args):
    try:
        return getattr(r, command)(*args)
    except redis.exceptions.ResponseError as e:
        if str(e).startswith('ASK'):
            parts = str(e).split()
            # parts = ['ASK', 'slot', 'host:port']
            host, port = parts[2].split(':')
            target = redis.Redis(host=host, port=int(port))
            target.execute_command('ASKING')
            return getattr(target, command)(*args)
        raise
```

## Observing ASK During Resharding

To see ASK redirections in action, start a reshard and run commands simultaneously:

```bash
# Terminal 1 - Start resharding
redis-cli --cluster reshard 10.0.0.1:6379 \
  --cluster-from source-node-id \
  --cluster-to target-node-id \
  --cluster-slots 100 \
  --cluster-yes

# Terminal 2 - Monitor for ASK redirections (raw client)
redis-cli -h 10.0.0.1 -p 6379 GET some-key-in-migrating-slot
# (error) ASK 3999 10.0.0.2:6379
```

With `redis-cli -c`, ASK redirections are handled automatically with `->` notation:

```bash
redis-cli -c -h 10.0.0.1 -p 6379 GET some-key
# -> Redirected to slot [3999] located at 10.0.0.2:6379
# "value"
```

## Checking Slot Migration State

```bash
# Check if any slots are in MIGRATING or IMPORTING state
# CLUSTER NODES shows migrating as [slot->-nodeID] and importing as [slot-<-nodeID]
redis-cli -h 10.0.0.1 -p 6379 CLUSTER NODES | grep "\["

# Check overall slot assignment counts
redis-cli -h 10.0.0.1 -p 6379 CLUSTER INFO | grep -E "cluster_slots"
```

## Troubleshooting Stuck Migrations

If a reshard gets interrupted and slots are stuck in MIGRATING or IMPORTING state, ASK redirections will continue indefinitely. Fix this by completing or reverting the migration:

```bash
# Check for stuck slots
redis-cli -h 10.0.0.1 -p 6379 CLUSTER NODES | grep "\["

# Complete the migration using fix
redis-cli --cluster fix 10.0.0.1:6379
```

The `--cluster fix` command detects partially migrated keys and completes or rolls back the migration.

## Impact on Performance

ASK redirections during resharding add a round trip for affected keys (the ASKING command + retry). This typically causes a minor, temporary latency increase for keys in migrating slots. For most workloads, the impact is small. If you observe significant latency during resharding, reduce the migration speed:

```bash
# Reduce the number of keys migrated per batch to lower impact
redis-cli --cluster reshard 10.0.0.1:6379 \
  --cluster-pipeline 5 \
  --cluster-timeout 5000
```

## Summary

The ASK redirection occurs during Redis Cluster slot migration and tells the client to try a different node for just this request without updating the slot cache. Unlike MOVED, ASK is temporary and specific to the migration period. Cluster-aware clients handle ASK transparently by sending ASKING followed by the command to the target node. If ASK redirections persist after a reshard completes, use `redis-cli --cluster fix` to resolve stuck migration states.
