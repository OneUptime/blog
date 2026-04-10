# Validation Summary: How to Use TOPK.LIST in Redis to Get Top-K Elements

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (TOPK probabilistic data structure)
- TOPK.LIST, TOPK.ADD, TOPK.RESERVE commands

## Sources Consulted
- RedisBloom TOPK command documentation (https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/)
- Redis TOPK.LIST command reference (https://redis.io/commands/topk.list/)
- Redis TOPK.RESERVE command reference (https://redis.io/commands/topk.reserve/)
- Redis TOPK.ADD command reference (https://redis.io/commands/topk.add/)

## Issues Found
No technical issues found.

## Review Notes
- The `--` comment syntax used in Redis code blocks is not valid Redis syntax (Redis has no comment syntax in redis-cli). However, this is a widely used convention in Redis tutorials for inline annotations and does not constitute a technical error in the context of a blog post.
- All TOPK.RESERVE parameter values (width, depth, decay) used throughout the examples are valid and reasonable for their respective use cases.
- The example outputs correctly reflect the expected behavior: counts match the number of TOPK.ADD calls, nil entries appear for unfilled K slots, and WITHCOUNT pairs are properly formatted.
- The comparison table between TOPK.LIST and Redis Sorted Sets is accurate and provides a fair characterization of trade-offs.
