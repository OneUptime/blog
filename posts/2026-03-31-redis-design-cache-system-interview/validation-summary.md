# Validation Summary: How to Design a Cache System Using Redis in a System Design Interview

## Status
validated

## Post Type
Guide / Interview Preparation

## Technologies Covered
- Redis (caching, eviction policies, key schema design)
- Python (redis-py client library)
- System design patterns (Cache-Aside, Write-Through, Write-Behind)

## Sources Consulted
- Redis official documentation on eviction policies: https://redis.io/docs/reference/eviction/
- Redis official documentation on configuration: https://redis.io/docs/management/config/
- redis-py API reference for `setex`, `get`, `delete`: https://redis-py.readthedocs.io/en/stable/
- Redis SET command documentation (EX option): https://redis.io/commands/set/
- Redis SETEX command documentation: https://redis.io/commands/setex/

## Issues Found
No technical issues found.

## Review Notes
- `redis.setex(name, time, value)` is still a valid method in redis-py 4.x+. An alternative is `redis.set(name, value, ex=seconds)`, but `setex` is not deprecated and works correctly as shown.
- The Hot Keys mitigation (appending a random suffix and reading from any shard) is a valid technique. In practice, the client would pick a random suffix from a known range on each read, so "reading from any shard" means picking one of the replicated key variants at random.
- The `volatile-ttl` recommendation for session caches is sound — it evicts keys with the shortest remaining TTL first, which aligns well with session expiration semantics.
- All code examples are pseudocode-style (using generic `db.query`/`db.execute` calls), which is appropriate for a system design interview context.
