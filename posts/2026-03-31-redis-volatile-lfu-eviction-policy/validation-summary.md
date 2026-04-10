# Validation Summary: How the volatile-lfu Eviction Policy Works in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (eviction policies, memory management)
- Redis LFU (Least Frequently Used) algorithm
- Redis CLI commands (CONFIG SET, OBJECT FREQ, INFO)
- Python redis-py client library

## Sources Consulted
- Redis official documentation on eviction policies (https://redis.io/docs/reference/eviction/)
- Redis official documentation on OBJECT FREQ command (https://redis.io/commands/object-freq/)
- Redis official documentation on LFU configuration (lfu-log-factor, lfu-decay-time)
- Redis source code: `server.h` (LFU_INIT_VAL definition) and `evict.c` (eviction logic, maxmemory-samples usage)

## Issues Found
- **Line 103 (comparison table)**: The table stated new keys under volatile-lfu have "counter = 0". This is incorrect. Redis initializes new keys with `LFU_INIT_VAL = 5` (defined in `server.h`) to give them a chance to accumulate accesses before being evicted. Fixed to "counter starts at 5".

## Review Notes
- The `lfu-log-factor 10` and `lfu-decay-time 1` values shown in the configuration section are the Redis defaults. The post uses them illustratively, which is fine, but readers should know these are already the defaults.
- The volatile-lru vs volatile-lfu comparison comment (line 82: "hot_cache risks eviction if recently accessed was cold_cache") is a simplification. Under LRU, eviction is based on recency of last access combined with sampling, so the risk depends on which keys get sampled. The core point (LRU doesn't consider frequency) is valid.
- The "warm_cache_entry" pattern of reading a key multiple times to boost its LFU counter is a real technique but adds network round-trips. In practice, the initial value of 5 already provides some protection against immediate eviction.
- The OBJECT FREQ example values (240 and 3) are illustrative. The actual LFU counter in Redis is a logarithmic counter capped at 255, so 240 is plausible for a very frequently accessed key.
