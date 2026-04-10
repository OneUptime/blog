# What Is New in Redis 7.0 (Functions, Sharded Pub/Sub)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Pub/Sub, AOF, Performance

Description: Redis 7.0 introduced Redis Functions for persistent scripting, Sharded Pub/Sub for cluster-aware messaging, and a new multi-part AOF format.

---

Redis 7.0, released in April 2022, was a major release bringing Redis Functions as a replacement for ephemeral Lua scripts, Sharded Pub/Sub for cluster environments, and structural improvements to persistence.

## Redis Functions

Before 7.0, Lua scripts were loaded with `SCRIPT LOAD` but were lost on restart. Redis Functions are stored server-side as named, persistent libraries.

Load a Lua function library:

```bash
redis-cli FUNCTION LOAD "#!lua name=mylib
  local function hello(keys, args)
    return 'Hello, ' .. args[1]
  end
  redis.register_function('hello', hello)
"
```

Call it like a regular command:

```bash
redis-cli FCALL hello 0 World
# "Hello, World"
```

List loaded functions:

```bash
redis-cli FUNCTION LIST
# 1) 1) "library_name"
#    2) "mylib"
#    3) "engine"
#    4) "LUA"
```

Functions persist through restarts and replicate to replicas automatically, unlike `EVAL` scripts which must be re-loaded after restart.

## Sharded Pub/Sub

Standard Pub/Sub in Redis Cluster forwards all messages through every node, creating unnecessary traffic. Redis 7.0 introduced Sharded Pub/Sub where messages stay within the shard that owns the channel's hash slot.

```bash
# Subscribe to a sharded channel
redis-cli SSUBSCRIBE orders:updates

# Publish to a sharded channel
redis-cli SPUBLISH orders:updates '{"order_id": 123, "status": "shipped"}'

# Unsubscribe
redis-cli SUNSUBSCRIBE orders:updates
```

The channel name is hashed to determine which shard handles it. Both publisher and subscriber connect to the same shard.

## Multi-Part AOF

Redis 7.0 replaced the single AOF file with a multi-part AOF format:

```text
appenddirname appendonlydir
appendonly yes
```

The AOF directory contains:
- `base.rdb` or `base.aof` - the base snapshot
- Incremental `incr-*.aof` files for recent commands

Benefits:
- Eliminates the rewrite buffer flush that could briefly block the main process
- The manifest file is updated atomically via a rename operation
- Reduced memory overhead since there is no in-memory AOF rewrite buffer

Check AOF status:

```bash
redis-cli INFO persistence | grep aof
```

## Listpack Migration

Redis 7.0 completed the migration from `ziplist` to `listpack` for small hashes, lists, sets, and sorted sets. Listpack uses less memory and avoids cascading reallocations.

```bash
redis-cli OBJECT ENCODING smallhash
# "listpack"
```

## Key Expiration Subsystem Improvements

Redis 7.0 improved the expired key eviction algorithm, reducing CPU spikes from bulk key expiration. Active expiration is now more adaptive.

## LMPOP and ZMPOP with Blocking Variants

Redis 7.0 added `LMPOP` and `ZMPOP` for popping from multiple lists and sorted sets, along with their blocking variants `BLMPOP` and `BZMPOP`:

```bash
# Block for up to 5 seconds waiting for an item
redis-cli BLMPOP 5 2 queue:high queue:low LEFT
```

## Summary

Redis 7.0 brought persistent scripting via Functions, cluster-efficient Sharded Pub/Sub, a new multi-part AOF format that eliminates the rewrite buffer flush bottleneck, and the completion of the listpack encoding migration. These changes improved Redis reliability, cluster scalability, and operational simplicity.
