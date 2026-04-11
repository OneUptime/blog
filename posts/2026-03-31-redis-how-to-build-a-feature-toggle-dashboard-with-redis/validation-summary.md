# Validation Summary: How to Build a Feature Toggle Dashboard with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Pub/Sub, key patterns)
- Python (redis-py client library)
- FastAPI (web framework integration)
- hashlib (MD5-based consistent hashing for rollout)

## Sources Consulted
- Redis commands documentation: https://redis.io/docs/latest/commands/ (HSET, HGET, HGETALL, HDEL, PUBLISH, KEYS)
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- FastAPI documentation: https://fastapi.tiangolo.com/ (Cookie parameters, startup events)
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found

1. **Data model inconsistency with code**: The data model section described `flag:{name}:users -> Set` but the actual code uses `flag:{name}:overrides` as a Redis Hash (using `hget`/`hset`/`hdel`). Fixed the data model to `flag:{name}:overrides -> Hash: user ID -> "1" or "0" for per-user overrides` to match the implementation.

2. **Unused `lru_cache` import**: The caching section imported `from functools import lru_cache` but used a custom TTL-based dictionary cache instead. Removed the unused import.

3. **Unused `Depends` import**: The FastAPI section imported `Depends` from fastapi but never used it in any endpoint. Removed the unused import.

## Review Notes
- `@app.on_event("startup")` is deprecated in FastAPI 0.93+ in favor of the `lifespan` context manager. The code still works but readers using newer FastAPI versions will see a deprecation warning.
- `r.keys("flag:*")` in `list_flags()` is functional but should not be used in production with large keyspaces as it blocks the Redis server. `SCAN` would be the production-appropriate alternative. This is a well-known caveat and acceptable for a tutorial context.
- The MD5-based consistent hashing for percentage rollout is a standard and correct approach for deterministic user assignment.
