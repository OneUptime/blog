# Validation Summary: How to Design a Redis-Based Microservices Architecture

## Status
validated

## Post Type
Tutorial / Architectural Guide

## Technologies Covered
- Redis (caching, Pub/Sub, Streams, distributed locks, service discovery)
- Python (redis-py client library)
- Redis CLI commands (SET, HSET)
- Redis Lua scripting (for atomic lock release)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis XADD command documentation: https://redis.io/docs/latest/commands/xadd/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis distributed locks (Redlock) documentation: https://redis.io/docs/latest/develop/use/patterns/distributed-locks/

## Issues Found
1. **Service Discovery bash example used HSET instead of SET** — The bash snippet used `HSET services:order-service instance-1 "10.0.0.1:8080"` (hash fields), but the Python code directly below uses `r.set(key, address, ex=ttl)` (string keys with per-key TTL). Redis does not support per-field TTL on hash data structures, so these two examples were incompatible. Fixed the bash example to use `SET services:order-service:instance-1 "10.0.0.1:8080" EX 30` to match the Python approach and support per-instance TTL via heartbeat renewal.

## Review Notes
- The `r.keys()` call in `lookup_service()` is an O(N) operation that blocks the Redis server and is documented as unsuitable for production use. `SCAN` would be preferred. This is a best-practice concern rather than a correctness error, so it was not changed, but it would be worth noting in a future revision.
- The distributed lock implementation is the standard single-instance Redis lock pattern. The post does not mention Redlock (the multi-instance algorithm), which would be needed for high-availability deployments. This is a scope choice, not an error.
- The `approximate=True` parameter passed to `xadd()` is technically redundant since it is already the default in redis-py, but it serves as useful documentation of intent and is not incorrect.
