# Validation Summary: How to Migrate from Memcached to Redis

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Redis
- Memcached
- redis-py
- python-memcached
- ioredis
- spymemcached
- Jedis
- twemproxy
- Python
- Node.js
- Java

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis HEXPIRE command documentation: https://redis.io/docs/latest/commands/hexpire/
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Redis redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- redis-py exceptions reference: https://redis.readthedocs.io/en/stable/exceptions.html
- Memcached basic text protocol documentation: https://docs.memcached.org/protocols/basic/
- Memcached user guide: https://docs.memcached.org/userguide/
- python-memcached project documentation: https://github.com/linsomniac/python-memcached
- ioredis official repository documentation: https://github.com/redis/ioredis
- Redis Jedis guide: https://redis.io/docs/latest/develop/clients/jedis/
- Jedis SetParams Javadocs: https://www.javadoc.io/doc/redis.clients/jedis/latest/redis/clients/jedis/params/SetParams.html
- twemproxy official repository documentation: https://github.com/twitter/twemproxy
- mcrouter official repository documentation: https://github.com/facebook/mcrouter

## Issues Found
- Redis `SETEX` was used in several examples. Redis documents `SETEX` as deprecated since Redis 2.6.12, so examples were changed to `SET` with the `EX` option or equivalent client APIs.
- The compatibility table described Memcached `incr`, `decr`, and `append` as direct Redis mappings. Notes were corrected because Redis initializes missing counters to 0, Redis counters can become negative, and Redis `APPEND` creates missing keys.
- The migration benefit list mentioned field-level TTL without a version caveat. It was corrected to hash field TTL and marked as Redis 7.4+.
- The cold migration example implied TTL preservation might be possible from Memcached reads. The comment now states TTL cannot be preserved unless tracked separately.
- The dual-write phase comments did not match the shown implementation, which reads Redis first and falls back to Memcached. The phase comments were corrected.
- The shadow-mode mismatch logging could fail for non-sliceable values and its method name said "rate" while returning a count. Logging now uses `repr(...)`, and the method is named `get_mismatch_count`.
- The proxy section overstated twemproxy as a Memcached-to-Redis replication mechanism. It now states that twemproxy can proxy either protocol but does not translate or replicate writes between Memcached and Redis by itself.
- Java snippets were missing imports needed for the shown classes, and the Jedis TTL example used `setex`. Imports were added and the example now uses `jedis.set(..., SetParams.setParams().ex(...))`.
- The compatibility-layer snippet was missing imports, used deprecated Redis `SETEX` calls, used process-local Python `hash()` values as mock CAS tokens, and did not preserve Memcached-like append behavior for missing keys. Imports were added, `SET` with `ex` is used, CAS tokens are now stable SHA-256 digests, and append now returns `False` if the key is missing.
- redis-py exception handling in the compatibility layer now imports `ResponseError` and `WatchError` from `redis.exceptions`, matching current redis-py documentation.

## Review Notes
The compatibility layer remains an illustrative bridge rather than a perfect Memcached emulation. Memcached client serialization, flags, binary values, multi-key return conventions, and exact CAS behavior can vary by client and should be tested against the production application's actual usage before rollout.
