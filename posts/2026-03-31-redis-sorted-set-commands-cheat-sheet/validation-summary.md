# Validation Summary: Redis Sorted Set Commands Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis sorted sets (ZADD, ZRANGE, ZRANK, ZSCORE, ZREM, ZPOPMIN/ZPOPMAX, ZMPOP, etc.)
- Redis set operations (ZUNIONSTORE, ZINTERSTORE, ZDIFFSTORE, ZUNION, ZINTER, ZDIFF)
- Redis 6.2+ unified ZRANGE syntax (BYSCORE, BYLEX, REV)
- Redis 7.0+ commands (ZMPOP, BZMPOP)
- Redis 7.2+ features (ZRANK WITHSCORE)

## Sources Consulted
- https://redis.io/docs/latest/commands/zadd/ — ZADD flags (NX, XX, GT, LT, CH, INCR)
- https://redis.io/docs/latest/commands/zrange/ — Unified ZRANGE with BYSCORE, BYLEX, REV, WITHSCORES
- https://redis.io/docs/latest/commands/zrank/ — WITHSCORE option (singular, added in Redis 7.2)
- https://redis.io/docs/latest/commands/zmpop/ — ZMPOP syntax (Redis 7.0+)
- https://redis.io/docs/latest/commands/bzmpop/ — BZMPOP syntax (Redis 7.0+)
- https://redis.io/docs/latest/commands/zunionstore/ — WEIGHTS and AGGREGATE options
- https://redis.io/docs/latest/commands/zinterstore/ — AGGREGATE MAX support
- https://redis.io/docs/latest/commands/zdiffstore/ — Exists since Redis 6.2
- https://redis.io/docs/latest/commands/zunion/ — Non-storing union (Redis 6.2+)
- https://redis.io/docs/latest/commands/zinter/ — Non-storing intersection (Redis 6.2+)
- https://redis.io/docs/latest/commands/zdiff/ — Non-storing difference (Redis 6.2+)
- https://redis.io/docs/latest/commands/zrandmember/ — Negative count allows repeats
- https://redis.io/docs/latest/commands/zscan/ — COUNT and MATCH order is interchangeable
- https://redis.io/docs/latest/commands/zlexcount/ — Lexicographic count with [/( prefix syntax
- https://redis.io/docs/latest/commands/zmscore/ — Multi-member score lookup (Redis 6.2+)

## Issues Found
1. **Misleading comment on ZRANGE index query (line 67):** The comment said "top 10 with scores" for `ZRANGE leaderboard 0 9 WITHSCORES`, but since index 0 corresponds to the lowest score (as stated in the section header), this returns the 10 lowest-scored members. In a leaderboard context, "top 10" implies the highest-scoring members. Changed to "lowest 10 with scores" for accuracy.

2. **Summary referenced wrong command name (line 148):** The summary mentioned "ZRANGEBYSCORE for score windows" but the post exclusively uses the unified `ZRANGE ... BYSCORE` syntax (Redis 6.2+), never the legacy ZRANGEBYSCORE command. Changed to "ZRANGE BYSCORE for score windows" to match the examples shown.

## Review Notes
- All command syntax verified correct against official Redis documentation.
- The post correctly uses the unified ZRANGE syntax (Redis 6.2+) with BYSCORE, BYLEX, and REV options throughout, which is the modern recommended approach.
- ZRANK WITHSCORE (line 83) requires Redis 7.2+ — the post does not annotate this version requirement, though it does annotate ZMPOP/BZMPOP as Redis 7.0+ and ZDIFFSTORE as Redis 6.2+. A version note could be helpful for consistency.
- GT/LT flags for ZADD, ZMSCORE, ZRANDMEMBER, and the unified ZRANGE options all require Redis 6.2+ — not annotated, but reasonable to omit since 6.2 is widely deployed.
