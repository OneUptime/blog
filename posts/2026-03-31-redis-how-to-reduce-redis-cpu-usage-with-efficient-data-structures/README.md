# How to Reduce Redis CPU Usage with Efficient Data Structures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Data Structure, CPU, Optimization

Description: Learn how choosing the right Redis data structure and encoding reduces CPU usage, with practical examples using hashes, sorted sets, and ziplist encodings.

---

## Why Data Structure Choice Affects CPU

Redis is single-threaded. Every CPU cycle spent in command processing is time that cannot be used for other client requests. Choosing the wrong data structure or encoding causes Redis to do more work per operation, reducing throughput and increasing latency.

Common CPU-intensive mistakes:
- Using individual string keys for structured objects (instead of hashes)
- Storing large sets when sorted sets with scores are needed
- Using KEYS for iteration (blocks the event loop)
- Running Lua scripts with O(N) operations on large collections

## Check Current CPU Usage

```bash
redis-cli INFO | grep -E "used_cpu|total_commands|instantaneous_ops"
```

```text
used_cpu_sys:142.345678
used_cpu_user:89.234567
used_cpu_sys_children:0.012345
used_cpu_user_children:0.034567
total_commands_processed:48291847
instantaneous_ops_per_sec:12543
```

## Use Hashes Instead of Many String Keys

Storing user objects as individual string keys:
```bash
# Inefficient: 4 keys, 4 round trips, high memory overhead per key
SET user:1001:name "Alice"
SET user:1001:email "alice@example.com"
SET user:1001:age "30"
SET user:1001:role "admin"
```

Using a hash (one key, one round trip, compact encoding):
```bash
# Efficient: 1 key, 1 round trip
HSET user:1001 name "Alice" email "alice@example.com" age "30" role "admin"
HGET user:1001 name
HMGET user:1001 name email
```

When a hash has fewer than 128 fields and each value is under 64 bytes, Redis uses a compact ziplist/listpack encoding internally, using 10x less memory than individual string keys and reducing CPU overhead for serialization.

```bash
# Check encoding
redis-cli OBJECT ENCODING user:1001
# -> listpack (compact)
```

## Tune ziplist/listpack Thresholds

Configure the thresholds at which Redis switches from compact to full encoding:
```text
# redis.conf
hash-max-listpack-entries 128
hash-max-listpack-value 64

set-max-intset-entries 512

zset-max-listpack-entries 128
zset-max-listpack-value 64

list-max-listpack-size -2
```

These compact encodings are CPU-efficient because operations on small collections are O(N) but with very small N and no pointer chasing.

## Use Integer Sets for Small Integer Collections

When a set contains only integers and has fewer than 512 members, Redis uses `intset` encoding - a sorted array that is extremely cache-friendly:

```bash
SADD user_ids 1001 1002 1003 1004 1005
OBJECT ENCODING user_ids
# -> intset (very efficient)

SADD user_ids "not-an-integer"
OBJECT ENCODING user_ids
# -> hashtable (downgraded)
```

Keep sets of integer IDs below the `set-max-intset-entries` threshold for maximum efficiency.

## Avoid SORT on Large Collections

The SORT command is O(N+M*log(M)) and blocks Redis. Use sorted sets instead when you need ordered data:

```bash
# Inefficient: sort at read time
LPUSH items 5 3 1 4 2
SORT items  # CPU-intensive for large lists

# Efficient: maintain order on write
ZADD ranked_items 5.0 "item:e"
ZADD ranked_items 3.0 "item:c"
ZADD ranked_items 1.0 "item:a"
ZRANGE ranked_items 0 -1 WITHSCORES  # O(log N + M)
```

## Use Bitmaps and BITCOUNT for Analytics

For boolean flags or counters, bit operations are extremely CPU-efficient:

```python
import redis

r = redis.StrictRedis(host='localhost', port=6379)

# Track daily active users with a bitmap
# 1 bit per user ID
user_id = 12345
date_key = "dau:2026-03-31"

# Mark user as active
r.setbit(date_key, user_id, 1)

# Count active users (very fast)
active_count = r.bitcount(date_key)
print(f"Daily active users: {active_count}")

# Check if specific user was active
was_active = r.getbit(date_key, user_id)
```

## Batch Operations to Reduce Command Overhead

Each command processed by Redis has a fixed overhead (parsing, argument checking, event loop iteration). Batch commands reduce this overhead:

```python
import redis

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

# Inefficient: N separate commands
for i in range(1000):
    r.set(f'key:{i}', f'value:{i}')

# Efficient: one pipeline call
pipe = r.pipeline(transaction=False)
for i in range(1000):
    pipe.set(f'key:{i}', f'value:{i}')
pipe.execute()

# Use MSET for multiple string keys
r.mset({f'key:{i}': f'value:{i}' for i in range(1000)})
```

## Avoid Expensive Lua Scripts

Lua scripts block Redis. Keep them short and avoid loops over large collections:

```python
# Inefficient Lua: iterates over all members
bad_script = """
local members = redis.call('SMEMBERS', KEYS[1])
local count = 0
for _, v in ipairs(members) do
    if tonumber(v) > tonumber(ARGV[1]) then
        count = count + 1
    end
end
return count
"""

# Better: use native ZRANGEBYSCORE on a sorted set
r.zadd('scored_set', {f'item:{i}': i for i in range(1000)})
count = r.zcount('scored_set', 500, '+inf')
```

## Monitor Per-Command CPU with COMMANDSTATS

```bash
redis-cli INFO commandstats | sort -t= -k2 -rn | head -20
```

```text
cmdstat_get:calls=1482931,usec=284761,usec_per_call=0.19
cmdstat_set:calls=489231,usec=183421,usec_per_call=0.37
cmdstat_hget:calls=284712,usec=81234,usec_per_call=0.28
cmdstat_keys:calls=12,usec=89432,usec_per_call=7452.67  # <- expensive!
```

`KEYS` called 12 times consumed 89ms total - over 7ms per call. Replace with SCAN.

## Summary

Reducing Redis CPU usage comes down to choosing compact encodings (hashes for objects, intsets for integer collections), avoiding O(N) commands on large collections, batching operations with pipelines, and using native data structures like sorted sets instead of client-side sorting. Monitor per-command CPU with `INFO commandstats` to identify your most expensive operations and target them first.
