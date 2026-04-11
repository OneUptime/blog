# Validation Summary: How to Design a News Feed Using Redis in a System Design Interview

## Status
validated

## Post Type
Tutorial / System Design Guide

## Technologies Covered
- Redis (Lists, Hashes, Pipelining, SET with EX)
- Python (redis-py client library)
- System design concepts (fan-out on write, fan-out on read, hybrid model)

## Sources Consulted
- Redis official documentation for LPUSH, LTRIM, LRANGE: https://redis.io/docs/latest/commands/lpush/, https://redis.io/docs/latest/commands/ltrim/, https://redis.io/docs/latest/commands/lrange/
- Redis official documentation for HSET, HMGET, EXPIRE: https://redis.io/docs/latest/commands/hset/, https://redis.io/docs/latest/commands/hmget/, https://redis.io/docs/latest/commands/expire/
- Redis official documentation for SET with EX option: https://redis.io/docs/latest/commands/set/
- redis-py documentation for pipeline: https://redis-py.readthedocs.io/en/stable/advanced_features.html#pipelines

## Issues Found

### 1. Key naming inconsistency in `get_feed` function
- **What was wrong:** The bash examples throughout the post use the key pattern `feed:user:42` (with a `user:` segment), but the Python `get_feed` function used `feed:{user_id}` (missing the `user:` segment). This inconsistency could confuse readers trying to implement the design.
- **What was changed:** Updated `feed:{user_id}` to `feed:user:{user_id}` in the Python code to match the bash examples.

### 2. Attribute access on string post IDs in sort
- **What was wrong:** `redis.lrange()` returns a list of strings (post IDs), not objects with attributes. The code `sorted(feed, key=lambda p: p.timestamp, reverse=True)` would raise an `AttributeError` because strings don't have a `.timestamp` attribute. The code was missing a step to resolve post IDs into post detail objects before sorting.
- **What was changed:** Renamed the variable to `feed_ids` for clarity, added a list comprehension `posts = [get_post(post_id) for post_id in feed_ids]` to resolve IDs to post objects, and changed `p.timestamp` to `p["timestamp"]` (dict access, consistent with how Redis hash results are returned in Python).

## Review Notes
- All Redis commands (LPUSH, LTRIM, LRANGE, HSET, EXPIRE, HMGET, SET with EX) use correct syntax and are current.
- The HSET multi-field syntax (`HSET key field1 val1 field2 val2`) is correct for Redis 4.0+.
- The summary claims "O(1) feed reads" — LRANGE is technically O(S+N) where S is the start offset and N is the number of elements returned, but since both are bounded constants for a fixed page size, this is an acceptable simplification for a system design interview context.
- The pipeline usage in redis-py is correct and idiomatic.
- The hybrid fan-out strategy (push for normal users, pull for celebrities) is a well-established pattern consistent with industry practice.
