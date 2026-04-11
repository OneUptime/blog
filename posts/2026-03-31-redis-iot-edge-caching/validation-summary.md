# Validation Summary: How to Implement IoT Edge Caching with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (in-memory data store)
- Python (redis-py client library)
- Python requests library
- Redis CLI
- Redis Pub/Sub

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis official command reference (DEL, HSET, HGETALL, EXPIRE, SET, PERSIST, HGET, RPUSH, LPOP, LPUSH, PUBLISH, CONFIG SET): https://redis.io/docs/latest/commands/
- Redis eviction policies documentation: https://redis.io/docs/latest/develop/reference/eviction/

## Issues Found
1. **DEL command missing `redis-cli` prefix**: The cache invalidation section showed `DEL config:d-001` in a bash code block. `DEL` is a Redis command, not a bash command — running it directly in a shell would fail. Fixed by adding the `redis-cli` prefix: `redis-cli DEL config:d-001`.

## Review Notes
- The `redis.Redis()` constructor is called without `decode_responses=True`, so `hgetall` and `hget` return byte strings rather than Python strings. This is technically correct and the code works as-is, but readers using the returned values as strings (e.g., in JSON or display) may need to add `decode_responses=True` to the Redis constructor. This is a common simplification in tutorials and not an error.
- The `hset(key, mapping=config)` call assumes `resp.json()` returns a flat dict with string/numeric values. Nested objects in the config JSON would cause a `DataError`. This is an acceptable simplification for tutorial purposes.
- The "Write-Through" section title is a loose use of the term — the pattern shown is a simple cache write rather than a classic write-through (which writes to both cache and backing store simultaneously). The code itself is correct; only the terminology is informal.
