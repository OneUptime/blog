# Validation Summary: How to Handle Missed Keyspace Notifications in Redis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (keyspace notifications, Pub/Sub, SCAN, pipelines, capped lists)
- Python (redis-py client library)
- schedule (Python job scheduling library)

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- redis-py (Python Redis client) API: https://redis-py.readthedocs.io/en/stable/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis LPUSH/LTRIM/LRANGE command documentation: https://redis.io/docs/latest/commands/lpush/

## Issues Found

1. **Misleading comment in ReliableSubscriber (line 47)**: The comment said "Send a heartbeat key periodically to confirm connectivity" but the code simply calls `pubsub.listen()` — no heartbeat is actually sent. Changed to "listen() blocks; connection errors break out to the except clause" which accurately describes the behavior.

2. **`reconcile_since` matches `version:global` key (Pattern 1)**: The SCAN with `match="version:*"` also matches the `version:global` counter key itself. This produced a false positive with `original_key` set to `"global"`. Added a `continue` guard to skip the global counter key during reconciliation.

## Review Notes
- All code examples assume `decode_responses=True` on the Redis client (redis-py returns bytes by default). This is a common convention in blog posts and is acceptable, but readers who use the default byte mode would need to adjust string operations.
- The `schedule` library example (Pattern 3) registers a job but does not show the `schedule.run_pending()` loop needed to actually execute scheduled jobs. This is acceptable as an illustrative snippet but readers should consult the schedule library docs for complete usage.
- The `write_with_version` function in Pattern 1 has a minor race condition: the `INCR` and subsequent pipeline `SET` commands are not atomic together, so under high concurrency two writers could get interleaved versions. For a blog post illustrating the pattern this is acceptable, but production use would need Lua scripting or MULTI/EXEC wrapping the full sequence.
