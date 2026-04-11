# Validation Summary: How to Design Redis Keys for Query Patterns

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (core data structures: Hashes, Sets, Sorted Sets, Strings)
- Redis Cluster (hash tags for slot co-location)
- Python (key builder helper class)

## Sources Consulted
- Redis official documentation for ZRANGE: https://redis.io/docs/latest/commands/zrange/
- Redis official documentation for ZREVRANGE (deprecated): https://redis.io/docs/latest/commands/zrevrange/
- Redis official documentation for ZRANGEBYSCORE (deprecated): https://redis.io/docs/latest/commands/zrangebyscore/
- Redis official documentation for hash tags in Cluster: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags
- Redis official documentation for HSET, SET, GET, SADD, SMEMBERS, SINTER, ZADD, INCR, EXPIRE, MEMORY USAGE, MGET

## Issues Found
1. **`ZREVRANGE` deprecated since Redis 6.2.0**: The post used `ZREVRANGE user:101:orders:recent 0 9` and `ZREVRANGE user:101:orders:recent 10 19` in Query Pattern 4. Replaced with `ZRANGE user:101:orders:recent 0 9 REV` and `ZRANGE user:101:orders:recent 10 19 REV`, which is the modern equivalent using the unified `ZRANGE` command with the `REV` flag.

2. **`ZRANGEBYSCORE` deprecated since Redis 6.2.0**: The post used `ZRANGEBYSCORE products:by_price 30 60` in Query Pattern 5. Replaced with `ZRANGE products:by_price 30 60 BYSCORE`, using the unified `ZRANGE` command with the `BYSCORE` flag.

3. **Misleading comment about MGET and Redis Cluster slots**: The comment said "Now MGET works across slots", which is incorrect. In Redis Cluster, multi-key commands like MGET require all keys to be on the same slot. The hash tags ensure the keys are co-located on the same slot, which is why MGET works. Changed the comment to "MGET works because both keys hash to the same slot".

## Review Notes
- The `{entity_type}:{entity_id}:{attribute}` template notation in the Key Naming Conventions section uses curly braces as placeholders, which could theoretically be confused with Redis Cluster hash tags. However, this is presented in a plain `text` code block and is clearly placeholder notation, so no change is needed.
- All other Redis commands (HSET, HGET, HGETALL, SET, GET, SADD, SMEMBERS, SINTER, ZADD, INCR, EXPIRE, MEMORY USAGE) are current and correct.
- The Python KeyBuilder class is syntactically correct and demonstrates a clean pattern.
- The TTL value 2592000 seconds correctly equals 30 days.
