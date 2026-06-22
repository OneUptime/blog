# Validation Summary: How to Debug Redis Client Connection Leaks

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Redis Server
- Redis CLI
- redis-py
- redis.asyncio
- Python
- Prometheus Python client
- Prometheus alerting rules

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CLIENT LIST command documentation: https://redis.io/docs/latest/commands/client-list/
- Redis CLIENT KILL command documentation: https://redis.io/docs/latest/commands/client-kill/
- Redis client handling reference: https://redis.io/docs/latest/develop/reference/clients/
- redis-py connection documentation: https://redis.readthedocs.io/en/stable/connections.html
- Redis asyncio with redis-py documentation: https://redis.io/docs/latest/develop/clients/redis-py/async/
- Redis FAQ on aioredis and redis-py asyncio: https://redis.io/faq/doc/26366kjrif/what-is-the-difference-between-aioredis-v2-0-and-redis-py-asyncio
- Prometheus Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- prometheus_client Counter implementation: https://github.com/prometheus/client_python/blob/master/prometheus_client/metrics.py

## Issues Found
- The post used the obsolete standalone `aioredis.create_redis_pool()` API. Redis documents that aioredis was merged into redis-py and current async examples should use `redis.asyncio`. Updated the async examples to use `from redis import asyncio as aioredis`, `Redis.from_url()`, and `await redis.aclose()`.
- The async leak example was titled "Async connections not awaited", but its actual issue was missing cleanup. Updated the heading and comments to describe the real problem.
- The Redis command `CLIENT KILL IDLE 3600` is not valid. Current Redis supports filters such as `ADDR`, `TYPE`, `USER`, and `MAXAGE`, but not `IDLE`. Replaced it with `CLIENT KILL MAXAGE 3600` and updated the comment to say it kills older connections, not idle connections.
- The redis-py examples implied that every `redis.Redis()` call was simply a new raw connection. redis-py clients own connection pools, so the problem is creating short-lived clients/pools per call. Updated the wording and the "good" example to reuse a module-level client.
- The Prometheus Python client exposes Counter metrics with a `_total` suffix. Updated alert expressions to use `redis_rejected_connections_total` and `redis_total_connections_total`.
- The Prometheus counter collection code could attempt to increment by a negative amount after a Redis restart or counter reset, which prometheus_client rejects. Added guards to increment only when the Redis counter has not decreased.
- The pool statistics examples use redis-py private internals. Added notes that these attributes are implementation details and can change between versions.

## Review Notes
The article is technically useful and accurate after the fixes. The pool-statistics snippets still depend on redis-py internals because redis-py does not expose all of the same detailed pool utilization fields as stable public API; this is acceptable for debugging examples but should be treated as version-sensitive.
