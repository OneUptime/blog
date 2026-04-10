# Validation Summary: How to Use ZREM in Redis to Remove Sorted Set Members

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis Sorted Sets
- ZREM command
- ZREMRANGEBYSCORE command
- ZREMRANGEBYRANK command

## Sources Consulted
- Official Redis ZREM documentation: https://redis.io/docs/latest/commands/zrem/
- Official Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found

### 1. Invalid comment syntax in Redis code blocks
**What was wrong:** The post used `--` (Lua-style comments) inside `redis` fenced code blocks in six places. Redis CLI does not support any comment syntax — typing `-- comment` would produce a command parsing error. This is misleading since the code blocks are tagged as `redis`, implying they are executable.

**Affected locations:**
- "Remove a Player from a Leaderboard" example: `-- Player left the game`
- "Removing Expired Sessions" example: `-- Find expired (score < now)` and `-- Returns: sess:B`
- "Cleaning Up a Rate Limiter Window" example: `-- Remove requests older than 60 seconds before now (1711900000)` and `-- Find old ones, then:`
- "Bulk Removal" section: `-- Remove all members with score between 0 and 100` and `-- Remove the bottom 5 members by rank`

**What was changed:** Removed the `--` comment lines from inside code blocks. Where context was needed, moved explanations to regular markdown text outside the code fences. In the Bulk Removal section, split the single code block into two separate blocks with descriptive text between them.

## Review Notes
- All core technical claims about ZREM (syntax, return value, time complexity, auto-delete behavior, non-existent key/member handling) are accurate per official Redis documentation.
- The O(M log N) complexity notation is correct (M = members removed, N = set size).
- The use cases (leaderboard, access revocation, session cleanup, rate limiting, feature flags) are all practical and correctly implemented.
- The recommendation to use ZREMRANGEBYSCORE/ZREMRANGEBYRANK for range-based removal instead of batching ZREM is sound advice.
