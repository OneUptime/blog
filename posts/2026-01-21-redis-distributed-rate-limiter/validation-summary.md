# Validation Summary: How to Build a Distributed Rate Limiter with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis Lua scripting and sorted sets
- Redis token bucket and sliding window rate limiting
- redis-py and Redis Cluster
- FastAPI / Starlette middleware
- Node.js with ioredis and Express
- Prometheus Python client metrics

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis HMSET command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis Cluster specification, hash tags: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- redis-py Cluster documentation: https://redis.readthedocs.io/en/stable/clustering.html
- Starlette middleware documentation: https://starlette.dev/middleware/
- FastAPI advanced middleware documentation: https://fastapi.tiangolo.com/advanced/middleware/
- ioredis documentation: https://github.com/redis/ioredis
- Express API documentation: https://expressjs.com/en/api/
- Prometheus Python client labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/

## Issues Found
- The token bucket Lua scripts used `HMSET`, which Redis marks deprecated as of Redis 4.0.0. Replaced both Python and Node.js Lua examples with `HSET`, which supports multiple field-value pairs.
- The FastAPI middleware class implemented `__call__(request, call_next)` while also storing `app`, which does not match Starlette's class middleware interface. Updated it to subclass `BaseHTTPMiddleware`, call `super().__init__(app)`, and implement `dispatch(request, call_next)`.
- The FastAPI snippet used `asyncio.get_event_loop()` inside an async method. Updated it to `asyncio.get_running_loop()`, which is the current correct API when already running in an event loop.
- The Redis Cluster snippet used dictionary startup nodes. Updated it to use `ClusterNode` objects, matching current redis-py cluster documentation.
- The standalone Cluster and graceful degradation Python snippets referenced types or modules that were not imported in those snippets. Added the missing imports.

## Review Notes
- The rate limiter examples use synchronous Redis calls in the FastAPI middleware via an executor. That is technically valid, though a production FastAPI service could also use an async Redis client to avoid thread-pool overhead.
- The Prometheus `rate_limit_remaining` gauge uses the full rate-limit key as a label. This is syntactically valid, but in production it may create high-cardinality metrics if keys include user IDs, API keys, or IP addresses.
- The multi-key limiter checks keys sequentially, so it is not an all-or-nothing atomic multi-key operation. This may be acceptable for conservative rate limiting, but a stricter implementation should use a Lua script with hash-tagged keys in Redis Cluster.
