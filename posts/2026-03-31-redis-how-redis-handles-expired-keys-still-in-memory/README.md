# How Redis Handles Expired Keys That Are Still in Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Expiration, Memory

Description: Understand how Redis manages keys with TTLs that have expired but haven't been removed yet - lazy expiration, active expiration, and memory implications.

---

Setting a TTL on a Redis key does not guarantee immediate deletion when the TTL expires. Redis uses a combination of lazy expiration and active expiration to manage expired keys efficiently. Understanding this behavior is important for capacity planning and avoiding surprises.

## How Expiration Works in Redis

When you set a TTL on a key, Redis stores the absolute expiration timestamp in memory alongside the key:

```bash
redis-cli SET mykey "value" EX 60
redis-cli TTL mykey
redis-cli PTTL mykey
```

Redis does not delete the key the instant it expires. Instead, it uses two strategies.

## Lazy Expiration

When a client accesses a key, Redis checks if it has expired before returning it. If expired, Redis deletes it and returns a nil response:

```bash
# After TTL expires
redis-cli GET mykey
# Returns: (nil)
```

This means an expired key stays in memory until something tries to access it. In a dataset with many expired keys that are never accessed, memory can grow unnecessarily.

## Active Expiration

Redis runs a background task every `hz` cycles per second (default 10) that randomly samples keys with TTLs and deletes the expired ones:

```bash
redis-cli CONFIG GET hz
```

The algorithm works as follows: Redis picks 20 random keys from the set of keys with TTLs. If more than 25% of them are expired, it repeats the process. This trades off between CPU usage and memory overhead from stale expired keys.

## Checking Expired Key Statistics

Monitor how many keys Redis is expiring:

```bash
redis-cli INFO stats | grep -E "expired_keys|expired_stale_perc"
```

See how many keys currently have TTLs:

```bash
redis-cli INFO keyspace
# Output: db0:keys=10000,expires=8000,avg_ttl=3600000
```

## Memory Impact

If you have millions of keys with TTLs that expire faster than Redis can evict them, memory usage can appear high even though the "live" data is much smaller. Force active expiration by increasing the hz value:

```bash
redis-cli CONFIG SET hz 25
```

Higher hz means more frequent expiration cycles but higher CPU usage. Values above 100 are not recommended.

## Implications for Replicas

Expiration is driven by the primary. Replicas do not independently delete expired keys from memory - they wait for DEL commands from the primary that result from lazy or active expiration. However, since Redis 3.2, replicas perform a logical expiration check and will not return expired keys to clients, even if the DEL has not yet arrived from the primary:

```bash
# On replica (secondary node)
redis-cli GET expired-key  # Returns (nil) after TTL expires, even before primary sends DEL
```

## Debugging Expired Key Behavior

Enable keyspace notifications to see when keys expire:

```bash
redis-cli CONFIG SET notify-keyspace-events "Ex"
redis-cli SUBSCRIBE __keyevent@0__:expired
```

## Summary

Redis expires keys using lazy deletion (on access) and active expiration (background sampling). Expired keys can remain in memory for some time after their TTL, which affects memory usage reporting. Increasing the `hz` setting speeds up active expiration at the cost of CPU, and replicas rely on the primary for expiration commands.
