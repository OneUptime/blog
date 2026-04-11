# How Redis Key Expiration Algorithm Works (Lazy + Active)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Key Expiration, TTL, Internal, Memory Management

Description: Understand how Redis combines lazy expiration on access and active background sampling to efficiently remove expired keys without blocking the server.

---

## Two Complementary Expiration Strategies

Redis uses two strategies to expire keys:

1. **Lazy expiration** - check if a key is expired when it is accessed
2. **Active expiration** - periodically sample random keys and delete expired ones in the background

Neither strategy alone is sufficient:
- Lazy-only: expired keys that are never accessed stay in memory forever
- Active-only: scanning all keys constantly would block the server

## Lazy Expiration

Every time a key is accessed (GET, HGET, LRANGE, etc.), Redis checks whether the key has expired before returning the value:

```c
// Simplified from redis/src/db.c
robj *lookupKey(redisDb *db, robj *key, int flags) {
    dictEntry *de = dictFind(db->dict, key->ptr);
    if (de) {
        robj *val = dictGetVal(de);
        long long when = getExpire(db, key);
        if (when >= 0) {
            if (when < mstime()) {
                // Key has expired - delete it now
                dbDelete(db, key);
                return NULL;
            }
        }
        return val;
    }
    return NULL;
}
```

In practice:

```bash
# Set a key with 1 second TTL
redis-cli SET mykey "hello" EX 1

# Wait 2 seconds...

# Accessing the key triggers lazy expiration
redis-cli GET mykey
# (nil) - key was found expired and deleted on this access
```

## Active Expiration Algorithm

Redis runs an active expiration cycle 10 times per second (configurable via `hz`). Each cycle:

1. Sample `ACTIVE_EXPIRE_CYCLE_KEYS_PER_LOOP` random keys (default: 20) from the expires dict
2. Delete all that are expired
3. If more than 25% of sampled keys were expired, repeat immediately
4. If 25% or fewer were expired, stop and wait for next cycle

```text
Active expiration cycle:

while true:
  for i in 1..20:
    key = random_key_from_expires_dict()
    if key.is_expired():
      delete(key)
      expired_count++

  if expired_count / 20 > 0.25:  # >25% were expired
    continue immediately          # Keep running (many expired keys)
  else:
    break                         # Stop (most keys are fresh)
```

## Configuring the Expiration Cycle Frequency

```bash
# Default: 10 cycles per second
redis-cli CONFIG GET hz
# 10

# Increase for more aggressive expiration cleanup
redis-cli CONFIG SET hz 20

# Adaptive hz (auto-adjusts based on client count)
redis-cli CONFIG GET dynamic-hz
# yes (default in Redis 5.0+)
```

## The Expires Dictionary

Redis maintains a separate expires dictionary (`db->expires`) that maps key pointers to their expiration times (milliseconds since epoch):

```text
db->dict (all keys):
  "session:123" -> {userId: 42, ...}
  "cache:product:1" -> {name: "Widget", ...}
  "permanent-key" -> "some value"

db->expires (only keys with TTL):
  "session:123" -> 1735689600000 (ms timestamp)
  "cache:product:1" -> 1735686000000 (ms timestamp)
  (permanent-key has no entry here)
```

## Monitoring Expiration Rate

```bash
# Check how many keys are expiring per second
redis-cli INFO stats | grep -E "expired_keys|evicted_keys"

# expired_keys: total keys deleted due to expiration (lazy + active)
# evicted_keys: total keys evicted due to maxmemory policy

# Watch in real time (1-second intervals)
redis-cli INFO stats | grep expired_keys
sleep 1
redis-cli INFO stats | grep expired_keys
# Difference = keys expired in last second
```

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

async function monitorExpirationRate() {
  let prevExpired = 0;

  setInterval(async () => {
    const stats = await redis.info('stats');
    const match = stats.match(/expired_keys:(\d+)/);
    const expired = parseInt(match?.[1] ?? '0');
    const rate = expired - prevExpired;
    prevExpired = expired;

    const keyspace = await redis.info('keyspace');
    const totalMatch = keyspace.match(/keys=(\d+)/);
    const total = parseInt(totalMatch?.[1] ?? '0');

    console.log(`Keys expired in last second: ${rate}, Total keys: ${total}`);
  }, 1000);
}
```

## Expiration Precision

Redis TTL is stored in milliseconds internally:

```bash
# Set TTL in seconds
redis-cli SET mykey hello EX 10
redis-cli TTL mykey      # Seconds remaining (rounded)
redis-cli PTTL mykey     # Milliseconds remaining (precise)

# Set exact expiration timestamp
redis-cli EXPIREAT mykey 1735689600    # Unix timestamp in seconds
redis-cli PEXPIREAT mykey 1735689600000  # Unix timestamp in milliseconds
```

## Key Expiration in Redis Cluster

In a Redis Cluster, key expiration is handled by the primary node that owns the slot. The primary expires the key lazily or actively and propagates the deletion to replicas:

```text
Primary (slot 1234):
  - Runs active expiration cycles
  - Deletes expired keys
  - Sends DEL command to replicas as replication command

Replica (slot 1234):
  - Returns nil for logically expired keys on read (since Redis 3.2)
  - Does NOT delete expired keys independently
  - Receives DEL from primary to actually remove the key
```

## Behavior with maxmemory Policies

When Redis reaches maxmemory, eviction policies interact with expiration:

```bash
# Eviction policies that prefer expiring keys:
redis-cli CONFIG SET maxmemory-policy volatile-lru    # LRU among keys with TTL
redis-cli CONFIG SET maxmemory-policy volatile-lfu    # LFU among keys with TTL
redis-cli CONFIG SET maxmemory-policy volatile-ttl    # Evict keys closest to expiry
redis-cli CONFIG SET maxmemory-policy volatile-random # Random among keys with TTL

# Policies that evict any key:
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
```

## Summary

Redis key expiration combines lazy deletion (on access) with active background sampling to keep memory usage in check without requiring expensive full scans. The active expiration cycle adapts its frequency based on the ratio of expired keys found - it runs more aggressively when many keys are expiring and backs off when the expiry rate is low. Tune the `hz` parameter to balance CPU usage against expiration latency for your workload.
