# Validation Summary: How to Implement a Daily Active Users Counter with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (bitmap commands: SETBIT, GETBIT, BITCOUNT, BITOP)
- Redis HyperLogLog (PFADD, PFCOUNT, PFMERGE)
- Python 3 (type hints, f-strings, datetime module)
- redis-py (Python Redis client library)

## Sources Consulted
- Redis SETBIT documentation: https://redis.io/commands/setbit
- Redis GETBIT documentation: https://redis.io/commands/getbit
- Redis BITCOUNT documentation: https://redis.io/commands/bitcount
- Redis BITOP documentation: https://redis.io/commands/bitop
- Redis PFADD documentation: https://redis.io/commands/pfadd
- Redis PFCOUNT documentation: https://redis.io/commands/pfcount
- Redis PFMERGE documentation: https://redis.io/commands/pfmerge
- Redis HyperLogLog documentation: https://redis.io/docs/data-types/probabilistic/hyperloglogs/
- redis-py API reference: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The `decode_responses=True` flag on the Redis connection is safe for all commands used in this post, since bitmap and HyperLogLog commands return integer values rather than byte strings.
- The `get_wau_hll()` function uses PFMERGE followed by PFCOUNT on the merged key. An alternative would be to pass multiple keys directly to PFCOUNT (which supports multi-key counting), but the approach used is equally correct and has the benefit of caching the merged result briefly.
- The bitmap memory calculation of "125 KB per 1M users" uses 1 KB = 1,000 bytes (metric). Using binary units (1 KiB = 1,024 bytes), it would be ~122 KiB. Both are common and the post's figure is reasonable.
- The temp key pattern (e.g., `wau:temp`, `mau:temp`) with short TTLs is a clean approach but could cause race conditions under concurrent access. For production use, unique temp key names (e.g., including a request ID) would be safer. This is a design consideration, not a correctness error.
