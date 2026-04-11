# Validation Summary: How to Implement Brute-Force Login Protection with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, EXPIRE, SET with EX, EXISTS, GET, TTL, DEL commands)
- Python (redis-py client library)
- Security concepts (brute-force protection, rate limiting, progressive delays)

## Sources Consulted
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis EXISTS command documentation: https://redis.io/docs/latest/commands/exists/
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **Unused import**: `import time` was imported but never used in any code example. Removed the unused import.

## Review Notes
- The pipeline created by `r.pipeline()` defaults to `transaction=True` in redis-py, wrapping commands in MULTI/EXEC. This is appropriate for this use case.
- The `EXPIRE` call after each `INCR` resets the TTL on every failure, creating a sliding window rather than a fixed window. This is a valid design choice for rate limiting but is not explicitly called out in the post.
- The `record_login_success` function deletes the IP failure counter but does not remove `login:locked:ip:{ip_address}`. This is a reasonable design decision — one successful login shouldn't automatically lift an IP-level lockout.
- The lockout checks (`r.set` for locking) happen outside the pipeline after `pipe.execute()`, introducing a small race window. For a blog post demonstrating the concept, this is acceptable; a production implementation might use a Lua script for full atomicity.
