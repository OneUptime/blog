# How to Use Hash Tags in Redis Cluster for Key Co-Location

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Hash Tag, Key, Sharding

Description: Learn how Redis Cluster hash tags force multiple keys to the same hash slot, enabling multi-key operations and transactions across related data.

---

In Redis Cluster, each key is hashed to one of 16384 slots, and multi-key operations (like `MGET`, `MSET`, transactions) only work when all keys are in the same slot. Hash tags let you control slot assignment by designating which part of the key is hashed.

## How Hash Tags Work

Normally, the entire key is hashed:

```text
CRC16("user:1001:profile") % 16384 = slot X
CRC16("user:1001:sessions") % 16384 = slot Y  (likely different)
```

With a hash tag (the `{...}` part), only the content inside `{}` is hashed:

```text
CRC16("user:1001") % 16384 = slot Z
CRC16("user:1001:profile{user:1001}") -> hash only "user:1001" -> slot Z
CRC16("user:1001:sessions{user:1001}") -> hash only "user:1001" -> slot Z
```

## Practical Hash Tag Patterns

### Pattern 1 - User-scoped keys

```bash
# All keys for user 1001 land on the same slot
SET {user:1001}:profile "Alice"
SET {user:1001}:sessions "3"
SET {user:1001}:preferences "{theme: dark}"

# Now this multi-key operation works
MGET {user:1001}:profile {user:1001}:sessions {user:1001}:preferences
```

### Pattern 2 - Order with related data

```bash
SET {order:5555}:details "..."
SET {order:5555}:items "[...]"
SET {order:5555}:status "pending"

# Atomic transaction works because all on same slot
MULTI
GET {order:5555}:status
SET {order:5555}:status "shipped"
EXEC
```

### Pattern 3 - Shorter hash tag in key prefix

```bash
# Hash on just the entity ID, use a short prefix
SET {1001}:profile "Alice"
SET {1001}:cart "[]"
MSET {1001}:profile "Alice" {1001}:cart "[]"
```

## Verifying Co-Location

```bash
redis-cli CLUSTER KEYSLOT "{user:1001}:profile"
redis-cli CLUSTER KEYSLOT "{user:1001}:sessions"
# Both should return the same slot number
```

## CROSSSLOT Error and How Hash Tags Fix It

Without hash tags:

```bash
redis-cli -c MSET user:1001:profile "Alice" user:1001:sessions 3
# (error) CROSSSLOT Keys in request don't hash to the same slot
```

With hash tags:

```bash
redis-cli -c MSET "{user:1001}:profile" "Alice" "{user:1001}:sessions" 3
# OK
```

## Transactions with Hash Tags

```bash
redis-cli -c
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379(TX)> SET "{user:1001}:balance" 100
QUEUED
127.0.0.1:6379(TX)> INCRBY "{user:1001}:balance" 50
QUEUED
127.0.0.1:6379(TX)> EXEC
1) OK
2) (integer) 150
```

## Hash Tag Caveats

```text
1. Hot slots: If many users are routed to the same slot, you get a hotspot
   - Avoid using a single hash tag for all keys

2. Uneven distribution: Using the same tag for everything defeats cluster sharding
   - Use entity IDs (user IDs, order IDs) as hash tags, not fixed strings

3. Key naming matters: {user:1001}:data and {user:1001}extra:data both use "user:1001"
   - Ensure your naming is consistent and deliberate
```

Check for hot slots:

```bash
redis-cli CLUSTER INFO | grep cluster_stats_messages
redis-cli -p 7001 INFO stats | grep keyspace_hits
```

## Summary

Hash tags in Redis Cluster force related keys onto the same hash slot by hashing only the content inside `{}` curly braces. Use entity IDs as hash tags (e.g., `{user:1001}:profile`) to enable multi-key operations and transactions for related data. Avoid overusing a single hash tag, as it creates hot spots that negate cluster scaling benefits.
