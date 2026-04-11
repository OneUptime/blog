# Validation Summary: How to Use OBJECT FREQ in Redis for LFU Access Frequency

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (OBJECT FREQ command, LFU eviction policies)
- Python (redis-py client library)
- Node.js (node-redis client library)

## Sources Consulted
- Redis OBJECT FREQ command documentation — https://redis.io/docs/latest/commands/object-freq/
- Redis eviction policies documentation — https://redis.io/docs/latest/develop/reference/eviction/
- Redis source code (object.c, server.h, config.c, evict.c) — https://github.com/redis/redis
- redis-py library source — https://github.com/redis/redis-py
- node-redis library source — https://github.com/redis/node-redis

## Issues Found

1. **Incorrect error message**: The blog showed `ERR object freq is not allowed when maxmemory-policy is not set to an LFU policy.` but the actual Redis error message is `An LFU maxmemory policy is not selected, access frequency not tracked. Please note that when switching between policies at runtime LRU and LFU data will take some time to adjust.` Fixed to match the actual Redis source.

2. **Python `client.object_freq(key)` method doesn't exist**: redis-py does not have a dedicated `object_freq()` method. The correct API is `client.object("freq", key)`. Fixed all three occurrences in the Python examples.

3. **Inaccurate LFU counter claim ("millions of accesses")**: The blog stated "A counter of 100 might represent millions of accesses." According to the official Redis probability table, with the default `lfu-log-factor` of 10, 1000 hits yields a counter of ~18 and 100K hits yields ~142. A counter of 100 corresponds to roughly tens of thousands of accesses, not millions. Fixed to "tens of thousands of accesses (with default factor of 10)."

4. **Unrealistic Basic Usage sample output values**: The example showed OBJECT FREQ returning 4 and 1 for keys. Since new keys are initialized with LFU_INIT_VAL=5, values below 5 are not possible without time decay. Fixed the example to show more realistic values (10 for a frequently accessed key, 5 for a rarely accessed key) and clarified that the popular key needs many accesses to build up frequency.

5. **Node.js top-level `await` with CommonJS `require()`**: The code used `require('redis')` (CommonJS) but had top-level `await` statements, which is not valid in CommonJS modules. Wrapped the code in an async IIFE `(async () => { ... })()` and added `client.quit()` for proper cleanup.

6. **Unused `import time`**: The Python example imported the `time` module but never used it. Removed the unused import.

7. **OBJECT IDLETIME compatibility table inaccuracy**: The comparison table stated OBJECT IDLETIME "Works With: LRU policies" but it actually works with all non-LFU policies (including noeviction, volatile-ttl, allkeys-random, etc.). The Redis source only rejects IDLETIME when `MAXMEMORY_FLAG_LFU` is set. Fixed to "All non-LFU policies."

## Review Notes
- The post correctly explains the logarithmic and probabilistic nature of the LFU counter, which is a common source of confusion.
- The Python SCAN-based example for finding cold keys is a sound pattern, though for very large keyspaces users should be aware of the performance implications of scanning all keys.
- The `lfu-log-factor` and `lfu-decay-time` tuning section is accurate and aligns with official Redis documentation.
