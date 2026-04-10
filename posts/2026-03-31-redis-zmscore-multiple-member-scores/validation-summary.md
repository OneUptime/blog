# Validation Summary: How to Use ZMSCORE in Redis to Get Multiple Member Scores

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (6.2+)
- Redis ZMSCORE command
- Redis ZSCORE command
- Redis Sorted Sets

## Sources Consulted
- Redis official documentation for ZMSCORE: https://redis.io/commands/zmscore/
- Redis official documentation for ZSCORE: https://redis.io/commands/zscore/
- Redis official documentation for ZADD: https://redis.io/commands/zadd/

## Issues Found
- **Line 67 — "position" used instead of "score"**: The text read "so her position returns nil. The positions of the other members are unaffected." ZMSCORE returns scores, not positions (ranks). ZRANK is the command that returns positional ranks. Changed "position" to "score" and "positions" to "scores" to accurately reflect what ZMSCORE returns.

## Review Notes
- The bash script example for handling nil results is a reasonable demonstration, though in practice redis-cli's non-TTY output format for nil values can vary by version. The approach shown is functional for illustrative purposes.
- All ZADD setup commands, ZMSCORE invocations, and expected outputs are correct.
- The comparison table accurately reflects the version history and capabilities of ZSCORE vs ZMSCORE.
