# Validation Summary: How to Use BZPOPMIN and BZPOPMAX for Blocking Sorted Set Pop

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (BZPOPMIN, BZPOPMAX, ZPOPMIN, ZPOPMAX, ZADD, BLPOP, BRPOP)
- Redis Sorted Sets
- Redis blocking commands

## Sources Consulted
- Redis official documentation for BZPOPMIN: https://redis.io/commands/bzpopmin/
- Redis official documentation for BZPOPMAX: https://redis.io/commands/bzpopmax/
- Redis official documentation for ZPOPMIN: https://redis.io/commands/zpopmin/
- Redis official documentation for BLPOP: https://redis.io/commands/blpop/
- Redis official documentation for BRPOP: https://redis.io/commands/brpop/
- Redis official documentation for BZMPOP: https://redis.io/commands/bzmpop/

## Issues Found
1. **Section heading mismatch (line 211):** The heading read "Comparison with BLPOP / BLMOVE" but the table underneath compares BZPOPMIN/BZPOPMAX with BLPOP/BRPOP (not BLMOVE). BLMOVE is a different command (blocking list move between lists). Fixed the heading to "Comparison with BLPOP / BRPOP" to match the table content.

## Review Notes
- **Deprecation notice:** As of Redis 7.0, BZPOPMIN and BZPOPMAX are regarded as deprecated in favor of BZMPOP (with MIN/MAX arguments). The commands still work and are widely used, but readers writing new code on Redis 7.0+ may want to consider BZMPOP instead. The post does not mention this, which is acceptable since the commands remain functional, but a future update could note the BZMPOP alternative.
- **Comment syntax in Redis code block:** The priority queue consumer example uses `--` as a comment prefix inside a `redis` code block. Redis CLI does not support inline comments; `--` is Lua comment syntax. This is clearly used for illustration and is unlikely to confuse readers, but copy-pasting directly into redis-cli would produce an error.
- All code examples, command syntax, return values, and expected outputs are correct.
- The O(log N) complexity claim for the pop operation is accurate.
- The FIFO ordering claim for multiple blocked clients is accurate per Redis documentation.
- The claim about decimal timeout support since Redis 6.0 is correct.
- The comparison table accurately describes the differences between sorted set blocking pops and list blocking pops.
