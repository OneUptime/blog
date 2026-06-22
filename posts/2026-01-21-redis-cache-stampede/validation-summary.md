# Validation Summary: How to Handle Cache Stampede (Thundering Herd) in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- redis-py
- node-redis
- Python threading and asyncio
- JavaScript async/Promise request coalescing
- Prometheus Python client
- Cache stampede prevention patterns

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis HSET/HGETALL command documentation: https://redis.io/docs/latest/commands/hgetall/
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- Redis Node.js client guide: https://redis.io/docs/latest/develop/clients/nodejs/
- Python threading documentation: https://docs.python.org/3/library/threading.html
- Python asyncio synchronization primitives documentation: https://docs.python.org/3/library/asyncio-sync.html
- Prometheus Python client documentation: https://github.com/prometheus/client_python
- "Optimal Probabilistic Cache Stampede Prevention" paper: https://cseweb.ucsd.edu/~avattani/papers/cache_stampede.pdf

## Issues Found
- The XFetch/probabilistic early expiration examples used `delta * beta * log(random())` directly as the threshold. Since `log(random())` is negative for random values in `(0, 1)`, the condition almost never triggered early refresh. Changed the formula to use `-delta * beta * log(rand)` and guarded against `log(0)`.
- The combined production example repeated the same probabilistic early expiration sign error. Updated it to the corrected early refresh window calculation.
- Redis `SETEX` is deprecated in Redis command documentation in favor of `SET` with `EX`. Replaced Python `setex(...)` calls with `set(..., ex=ttl)` and the Node.js `setEx(...)` call with `set(..., { EX: ttl })`.
- The basic lock example said it would fall back to fetching directly after waiting, but returned `None` on wait timeout. Updated the caller to fetch directly when waiting times out.
- The Python `Singleflight` implementation used mutable `call.count` to decide which caller was the leader. A later waiter could increment the count before the first caller checked it, causing the leader to wait on its own event. Added an explicit `leader` flag.
- Shared in-process `refreshing` sets were accessed without synchronization in background refresh examples. Added locks around check/add/remove operations.
- Several snippets referenced types or modules without importing them in the shown block. Added missing imports where needed and removed an unused `schedule` import.

## Review Notes
The Redis single-instance lock pattern shown is consistent with Redis documentation when it uses `SET ... NX EX` plus token-checked Lua release, but Redis documentation notes that Redlock provides stronger guarantees for fault-tolerant distributed locking. The examples are still educational snippets and use placeholder application functions such as `fetch_product_from_database`.
