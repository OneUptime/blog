# Validation Summary: How to Share Rate Limit State Across Microservices with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lua scripting, INCR, EXPIRE, KEYS, GET, TTL commands)
- Python (redis-py client library)
- Microservice architecture / distributed rate limiting

## Sources Consulted
- Redis INCR command documentation: https://redis.io/commands/incr
- Redis EXPIRE command documentation: https://redis.io/commands/expire
- Redis EVAL / Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py `register_script` API documentation: https://redis-py.readthedocs.io/en/stable/advanced_features.html#lua-scripting
- Redis KEYS command documentation: https://redis.io/commands/keys

## Issues Found
No technical issues found.

## Review Notes
- The `r = get_redis()` variable in `check_limits` is assigned but unused within the function body. This is harmless dead code, not a bug.
- The global counter is incremented even when the service-level limit subsequently rejects the request. This is a common trade-off in rate limiter implementations, not a bug — the post does not claim otherwise.
- The `KEYS` command used in the "Inspecting Shared State" section is appropriate for debugging/inspection. In production with large keyspaces, `SCAN` is preferred, but the post's usage context is reasonable.
- The Lua script implements a fixed-window rate limiter. Sliding-window approaches exist but are out of scope for this post.
