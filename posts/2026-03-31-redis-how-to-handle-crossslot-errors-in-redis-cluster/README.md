# How to Handle CROSSSLOT Errors in Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, CROSSSLOT, Hash Tag, Multi-Key Operations

Description: Learn why Redis Cluster throws CROSSSLOT errors for multi-key operations and how to fix them using hash tags and key redesign strategies.

---

## What Is a CROSSSLOT Error?

In Redis Cluster, each key is assigned to one of 16384 hash slots, and each slot is owned by a specific primary node. Multi-key commands like `MSET`, `MGET`, `SMOVE`, `RPOPLPUSH`, and Lua scripts must operate on keys that all reside on the same slot (and thus the same node).

When you run a multi-key command where the keys span different slots, Redis returns:

```text
(error) CROSSSLOT Keys in request don't hash to the same slot
```

## Why This Error Occurs

Example:

```bash
redis-cli -c MSET user:1 "alice" user:2 "bob"
```

- `user:1` hashes to slot 10778
- `user:2` hashes to slot 6777
- These are different slots on different nodes
- Redis cannot process this as a single atomic operation

## Solution 1 - Use Hash Tags

Redis allows you to force multiple keys to the same slot by using **hash tags** - a substring enclosed in `{}` that Redis uses instead of the full key for slot computation.

```bash
# Both keys use {user} as the hash tag -> same slot
MSET {user}:1 "alice" {user}:2 "bob"
```

Hash tag examples:

```bash
{user}:profile -> hashes on "user"
{user}:settings -> hashes on "user"
{order}:123 -> hashes on "order"
{order}:456 -> hashes on "order"
```

These keys with the same hash tag will always be on the same slot and the same node.

Verify they are on the same slot:

```bash
redis-cli CLUSTER KEYSLOT "{user}:1"
redis-cli CLUSTER KEYSLOT "{user}:2"
```

Both should return the same slot number.

## Solution 2 - Redesign Your Keys

If adding hash tags is not feasible, redesign your data model so operations only need one key at a time:

Instead of:

```bash
# CROSSSLOT error
MGET user:1 user:2 user:3
```

Use:

```bash
# Single-key operations - no CROSSSLOT
GET user:1
GET user:2
GET user:3
```

Or use pipelines for efficiency:

```python
from redis.cluster import RedisCluster, ClusterNode

r = RedisCluster(startup_nodes=[ClusterNode("192.168.1.11", 7001)])

# Use pipeline for multiple gets - no CROSSSLOT
with r.pipeline() as pipe:
    pipe.get("user:1")
    pipe.get("user:2")
    pipe.get("user:3")
    results = pipe.execute()
```

## Solution 3 - Server-Side Lua Scripts

Lua scripts run atomically on a single node, but all keys they access must be in the same slot. Pass all keys as KEYS arguments and use hash tags:

```lua
-- script.lua
local val1 = redis.call("GET", KEYS[1])
local val2 = redis.call("GET", KEYS[2])
return {val1, val2}
```

Execute:

```bash
redis-cli -c EVAL "$(cat script.lua)" 2 "{user}:1" "{user}:2"
```

The cluster verifies all keys in KEYS are in the same slot before executing.

## Solution 4 - Use MGET with Hash Tags in Application Code

Refactor MGET calls to use hash-tagged keys:

```javascript
const Redis = require("ioredis");
const cluster = new Redis.Cluster([{ host: "192.168.1.11", port: 7001 }]);

// Before (CROSSSLOT error)
// await cluster.mget("user:1", "user:2");

// After (hash tags - same slot)
await cluster.mset("{user}:1", "alice", "{user}:2", "bob");
const results = await cluster.mget("{user}:1", "{user}:2");
```

## Diagnosing CROSSSLOT Issues

Check which slot a key maps to:

```bash
redis-cli -h 192.168.1.11 -p 7001 CLUSTER KEYSLOT "user:1"
redis-cli -h 192.168.1.11 -p 7001 CLUSTER KEYSLOT "user:2"
```

If the slots differ, you need hash tags or single-key operations.

## Commands That Trigger CROSSSLOT

Commands that fail with CROSSSLOT when keys are on different slots:

```text
MSET, MGET, MSETNX
DEL (multiple keys)
RPOPLPUSH, LMOVE
SMOVE, SUNION, SINTER, SDIFF
ZUNIONSTORE, ZINTERSTORE, ZDIFFSTORE
COPY
RENAME, RENAMENX
SORT with BY or GET
EVAL, EVALSHA (when KEYS span slots)
XREAD (multiple streams)
```

## Trade-offs of Hash Tags

Hash tags concentrate multiple keys on the same node. The trade-offs are:

- Pro: Enables atomic multi-key operations
- Pro: Lua scripts work across grouped keys
- Con: Keys with the same tag on one node can create hot spots
- Con: If that node fails, all tagged keys are unavailable

Design hash tags to spread load. Avoid using the same tag for millions of keys if they are all hot.

## Summary

CROSSSLOT errors in Redis Cluster occur when multi-key commands reference keys that hash to different slots. The standard fix is to use hash tags (e.g., `{user}:1` and `{user}:2`) to force related keys to the same slot and node. When hash tags are not appropriate, redesign operations to work with single keys at a time or use pipelines. Always verify slot assignments with `CLUSTER KEYSLOT` when designing your key schema for a cluster deployment.
