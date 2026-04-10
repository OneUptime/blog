# How to Use OBJECT IDLETIME in Redis to Check Key Idle Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OBJECT IDLETIME, Eviction, Memory Management, LRU

Description: Learn how to use OBJECT IDLETIME in Redis to check how long a key has been idle since its last access, useful for cache analysis and LRU eviction tuning.

---

## What Is OBJECT IDLETIME?

`OBJECT IDLETIME` returns the number of seconds since a key was last accessed (read or written). This is the idle time tracked by Redis for its LRU (Least Recently Used) eviction algorithm.

## Basic Syntax

```text
OBJECT IDLETIME key
```

## Basic Usage

```bash
redis-cli SET greeting "hello"
redis-cli OBJECT IDLETIME greeting
```

Output:

```text
(integer) 0
```

After waiting a few seconds:

```bash
sleep 5
redis-cli OBJECT IDLETIME greeting
```

Output:

```text
(integer) 5
```

## How LRU Uses Idle Time

When Redis uses an LRU-based eviction policy like `allkeys-lru` or `volatile-lru`, keys with the highest idle time are the first candidates for eviction. `OBJECT IDLETIME` lets you inspect this directly.

Check a key that may be evicted soon:

```bash
redis-cli OBJECT IDLETIME rarely-used-key
```

If this returns a very large number, it is a candidate for eviction when memory is under pressure.

## Limitations with LFU Policy

`OBJECT IDLETIME` is not available when the `maxmemory-policy` is set to an LFU-based policy. When using LFU-based policies (`allkeys-lfu`, `volatile-lfu`), this command returns an error because Redis tracks access frequency instead of last access time.

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
redis-cli OBJECT IDLETIME mykey
```

```text
(error) ERR object idle time is only available when maxmemory-policy is not set to an LFU policy.
```

Use `OBJECT FREQ` instead when LFU is active.

## Scanning for Stale Keys

Combine `SCAN` with `OBJECT IDLETIME` to find keys that have not been accessed recently:

```bash
redis-cli --scan --pattern "cache:*" | while read KEY; do
  IDLE=$(redis-cli OBJECT IDLETIME "$KEY")
  if [ "$IDLE" -gt 3600 ]; then
    echo "Stale key: $KEY (idle ${IDLE}s)"
  fi
done
```

This finds cache keys idle for more than an hour.

## Resetting Idle Time

Any read or write to a key resets its idle time:

```bash
redis-cli GET mykey
redis-cli OBJECT IDLETIME mykey
# (integer) 0 - reset by the GET
```

## Practical Cache Audit Example

```python
import redis

r = redis.Redis(host='localhost', port=6379)

for key in r.scan_iter('session:*'):
    idle = r.object_idletime(key)
    if idle > 86400:  # 24 hours
        print(f"Stale session: {key.decode()} ({idle}s idle)")
        r.delete(key)
```

## Summary

`OBJECT IDLETIME` exposes Redis's internal LRU clock for any key. Use it to identify stale cache entries, understand eviction behavior, and build proactive cleanup scripts. Remember it is not available with LFU policies - switch to `OBJECT FREQ` when running LFU eviction.
