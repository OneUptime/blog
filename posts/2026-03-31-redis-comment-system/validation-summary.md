# Validation Summary: How to Build a Comment System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lists, Hashes, String counters, TTL/expiry, Pipelines)
- Python 3 with redis-py client library

## Sources Consulted
- Redis official command reference for LPUSH, LRANGE, LREM, HSET, HGETALL, INCR, DECR, EXPIRE, GET, DELETE — https://redis.io/docs/latest/commands/
- redis-py documentation for `hset(mapping=)`, `pipeline()`, `lrem(name, count, value)` parameter order — https://redis-py.readthedocs.io/en/stable/

## Issues Found
No technical issues found.

## Review Notes
- The `add_ephemeral_comment` function sets a TTL only on the comment list key (`comments:{content_id}`), not on the individual comment hash keys (`comment:{commentId}`) or the count key (`comment_count:{contentId}`). After the list expires, those keys become orphaned. This is not a technical error (the code works as written), but a design limitation worth noting for production use.
- The pipeline in `delete_comment` uses `lrem` with count=1, which is correct given that comment IDs are UUIDs and therefore unique in the list.
- `LRANGE`-based pagination is O(S+N) where S is the start offset. For very large comment threads with deep pagination, this could become slow. A Sorted Set keyed by timestamp would offer O(log N) access, but for typical use cases the List approach is appropriate.
- The pipeline defaults to `transaction=True` (MULTI/EXEC), so the multi-step operations in `add_comment`, `delete_comment`, and `add_reply` execute atomically, which is correct for data consistency.
