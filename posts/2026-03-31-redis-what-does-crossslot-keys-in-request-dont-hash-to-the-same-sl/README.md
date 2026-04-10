# What Does 'CROSSSLOT Keys in request don't hash to the same slot' Mean

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, CROSSSLOT, Hash Slot, Multi-Key Operations, Troubleshooting

Description: Understand why Redis Cluster returns CROSSSLOT for multi-key operations and learn how to use hash tags to co-locate related keys on the same hash slot.

---

## What Is the CROSSSLOT Error

When you run a multi-key Redis command in cluster mode and the keys map to different hash slots (and thus different nodes), Redis returns:

```text
(error) CROSSSLOT Keys in request don't hash to the same slot
```

Redis Cluster requires that all keys in a multi-key operation reside on the same node. Since keys are distributed across nodes by hash slot, operations spanning multiple nodes in a single command are not supported.

## Commands Affected

Commands that operate on multiple keys and can produce CROSSSLOT errors:

```text
MSET / MGET / MSETNX
DEL (multiple keys)
SUNION / SINTER / SDIFF
SUNIONSTORE / SINTERSTORE / SDIFFSTORE
SMOVE
LMOVE (when src and dst are on different slots)
RPOPLPUSH / BRPOPLPUSH
ZUNIONSTORE / ZINTERSTORE
ZDIFF / ZDIFFSTORE
COPY
RENAME / RENAMENX
BITOP
EVAL (when keys span multiple slots)
```

## Why Redis Cluster Has This Limitation

Redis Cluster is a distributed system where each node only holds a subset of keys. A multi-key operation would require coordinating across multiple nodes, which would introduce distributed transactions, locking, or network round trips that Redis's single-threaded model does not support.

## How to Diagnose

Check which slots your keys map to:

```bash
redis-cli CLUSTER KEYSLOT user:100
# (integer) 5649

redis-cli CLUSTER KEYSLOT order:100
# (integer) 5681

# Different slots - MSET will fail
redis-cli -c MSET user:100 "alice" order:100 "pending"
# (error) CROSSSLOT Keys in request don't hash to the same slot
```

## Fix 1 - Use Hash Tags

Hash tags force related keys to the same slot by using a shared tag in curly braces `{tag}`. Redis computes the slot based only on the content inside `{}`:

```bash
redis-cli CLUSTER KEYSLOT {100}.user
# (integer) 3755
redis-cli CLUSTER KEYSLOT {100}.order
# (integer) 3755

# Same slot - MSET works
redis-cli -c MSET {100}.user "alice" {100}.order "pending"
# OK
```

### Hash Tag Examples

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='10.0.0.1', port=6379)

user_id = 100

# Without hash tags - may be on different slots
# rc.mset({'user:100': 'alice', 'order:100': 'pending'})  # CROSSSLOT error

# With hash tags - co-located on same slot
rc.mset({
    f'{{user:{user_id}}}.profile': 'alice',
    f'{{user:{user_id}}}.session': 'active',
    f'{{user:{user_id}}}.orders': 'pending'
})

# Multi-get works too
values = rc.mget([
    f'{{user:{user_id}}}.profile',
    f'{{user:{user_id}}}.session'
])
```

## Fix 2 - Issue Commands Individually

If hash tags are not applicable, issue individual commands instead of multi-key commands:

```python
# Instead of MSET
for key, value in data.items():
    rc.set(key, value)

# Instead of MGET
values = [rc.get(key) for key in keys]

# Instead of DEL with multiple keys
for key in keys:
    rc.delete(key)
```

Using pipelines can reduce round trip overhead when operating on multiple keys:

```python
pipe = rc.pipeline()
for key, value in data.items():
    pipe.set(key, value)
pipe.execute()
```

## Fix 3 - Use Lua Scripts with Hash Tags

Lua scripts in Redis Cluster must declare all keys as parameters (KEYS array). The keys still must be on the same slot:

```bash
redis-cli -c EVAL "
  local val1 = redis.call('GET', KEYS[1])
  local val2 = redis.call('GET', KEYS[2])
  return {val1, val2}
" 2 "{100}.user" "{100}.order"
```

The keys `{100}.user` and `{100}.order` both hash to slot based on `100`, so they are on the same node.

## Fix 4 - Design Keys Around Access Patterns

When designing your Redis key schema for cluster mode, group keys that are frequently accessed together under the same hash tag:

```text
# E-commerce: group by user ID
{user:1000}.cart
{user:1000}.wishlist
{user:1000}.session

# Analytics: group by date
{2026-03-31}.pageviews
{2026-03-31}.signups
{2026-03-31}.purchases

# Leaderboard: group by game
{game:chess}.daily
{game:chess}.weekly
{game:chess}.all-time
```

## Using Pipelining Across Slots

For batch operations across different slots, pipeline commands to avoid N round trips while accepting that each key goes to the correct node:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='10.0.0.1', port=6379)

keys = ['user:1', 'user:2', 'user:3', 'user:4']
pipe = rc.pipeline()
for key in keys:
    pipe.get(key)
results = pipe.execute()
```

Redis cluster clients typically support cross-slot pipelining by routing each command to the correct node internally.

## Summary

The CROSSSLOT error occurs in Redis Cluster when a multi-key command targets keys on different hash slots. The primary fix is to use hash tags - enclosing a common string in `{curly braces}` - to ensure related keys land on the same slot. When hash tags are not practical, break multi-key operations into individual commands or use pipelining to batch them efficiently across nodes.
