# Validation Summary: How to Build a News Feed (Timeline) System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets, Sets, Hashes, Pipelines)
- Python (redis-py client library)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis ZREVRANGE documentation: https://redis.io/commands/zrevrange
- Redis ZREMRANGEBYRANK documentation: https://redis.io/commands/zremrangebyrank
- Redis SADD documentation: https://redis.io/commands/sadd (return value semantics)
- Redis HINCRBY documentation: https://redis.io/commands/hincrby
- Redis SCARD documentation: https://redis.io/commands/scard
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Unused import `json`**: The `import json` statement was included but never used in any code example. Removed it.

2. **`like_post` double-like bug**: `hincrby` incremented the `likes` counter unconditionally, while `sadd` only adds to the set if the member is new. If a user liked a post twice, the counter would increment both times but the set would only contain the user once, causing the `likes` hash field to drift out of sync with the `liked_by` set. Fixed by checking the return value of `sadd` (returns 1 if added, 0 if already present) before incrementing.

3. **Incomplete data model section**: The data model listed `post:{post_id}`, `user:{user_id}:following`, and `feed:{user_id}`, but omitted `user:{user_id}:followers` (used by `follow_user`, `publish_post`, and `smart_publish`) and `timeline:{user_id}` (used by the pull and hybrid models). Added both to the data model.

4. **Pull model missing write function**: The `get_feed_pull` function reads from `timeline:{fid}` sorted sets, but no code in the pull model section populated those keys. The `timeline:{author_id}` key was only introduced later in the hybrid model section, making the pull model section incomplete as a standalone pattern. Added a `publish_post_pull` function that writes posts to the author's own timeline sorted set.

## Review Notes
- The `like_post` fix uses the `sadd` return value to guard the increment, which avoids the data inconsistency but is not fully atomic (another client could interleave between `sadd` and `hincrby`). A Lua script would provide true atomicity, but the current approach is adequate for a tutorial.
- The `zremrangebyrank(key, 0, -(FEED_MAX_LENGTH + 1))` trimming logic is correct: it removes all elements from rank 0 up to rank N-1001 (inclusive), keeping the top 1000 highest-scored entries.
- The complexity claims in the summary ("O(log n) insertion and O(log n + page_size) retrieval") are accurate per Redis documentation.
