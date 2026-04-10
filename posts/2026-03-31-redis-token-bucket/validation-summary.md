# Validation Summary: How to Implement a Token Bucket in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lua scripting, HMGET, HSET, EXPIRE commands)
- Lua (server-side scripting in Redis)
- Python (redis-py client library)
- Token bucket algorithm for rate limiting

## Sources Consulted
- Redis EVAL/EVALSHA and Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis HMGET command documentation: https://redis.io/docs/latest/commands/hmget/
- Redis HSET command documentation (multi field-value support since Redis 4.0): https://redis.io/docs/latest/commands/hset/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- redis-py `register_script` documentation: https://redis-py.readthedocs.io/en/stable/
- Python `time.time()` documentation: https://docs.python.org/3/library/time.html#time.time
- Token bucket algorithm (Wikipedia): https://en.wikipedia.org/wiki/Token_bucket

## Issues Found
No technical issues found.

## Review Notes
- The `get_bucket_state` function returns the raw stored token count without recalculating based on elapsed time since `last_refill`. This means the reported count may be lower than what is actually available. This is not a bug — the function accurately returns the persisted state — but users should be aware that the true available token count requires the same elapsed-time calculation as the Lua script. A future enhancement could add a read-only Lua script that returns the real-time token count.
- The Lua script accepts `now` as a client-supplied argument (`time.time()` from Python). An alternative is to use `redis.call('TIME')` for server-side timestamps, which avoids clock skew between application servers. Both approaches are valid and commonly used; the client-time approach is simpler and works well when server clocks are synchronized (e.g., via NTP).
- `HSET` with multiple field-value pairs requires Redis 4.0+. This is not called out in the post, but Redis 4.0 was released in 2017 and is well past end-of-life for older versions, so this is unlikely to be an issue in practice.
