# Validation Summary: How to Use BLMOVE in Redis for Blocking List Move

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (6.2+)
- BLMOVE command
- LMOVE command
- BRPOPLPUSH command (deprecated predecessor)
- Redis blocking list operations

## Sources Consulted
- Official Redis BLMOVE documentation: https://redis.io/docs/latest/commands/blmove/
- Official Redis BRPOPLPUSH documentation: https://redis.io/docs/latest/commands/brpoplpush/
- Official Redis LMOVE documentation: https://redis.io/docs/latest/commands/lmove/

## Issues Found
1. **Incorrect version attribution for decimal timeout support**: The post stated "decimals supported since Redis 6.0" in the timeout parameter description. The Redis 6.0 change (timeout interpreted as double instead of integer) applied to older blocking commands (BLPOP, BRPOP, BRPOPLPUSH). Since BLMOVE was introduced in Redis 6.2, it has always accepted double values for timeout. The "since Redis 6.0" note was misleading in this context. **Fix**: Changed to "supports decimal values" to accurately reflect that BLMOVE has always supported decimal timeouts.

## Review Notes
- The `--` comment syntax used in Redis code blocks is not valid redis-cli syntax, but it is a widely used convention in Redis tutorials for annotating commands. This is acceptable as a pedagogical choice.
- The FIFO ordering claim for multiple blocking clients is accurate for Redis blocking commands in general, though it is not explicitly documented on the BLMOVE command page itself.
- All code examples produce correct output and demonstrate valid usage patterns.
- The BRPOPLPUSH equivalence comparison is accurate.
