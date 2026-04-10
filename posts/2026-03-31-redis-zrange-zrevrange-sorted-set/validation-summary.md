# Validation Summary: How to Use ZRANGE and ZREVRANGE in Redis for Sorted Set Queries

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (6.2+ and legacy)
- Redis Sorted Sets
- ZRANGE command (index, BYSCORE, BYLEX, REV, LIMIT)
- ZREVRANGE command (legacy)

## Sources Consulted
- Official Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Official Redis ZREVRANGE documentation: https://redis.io/docs/latest/commands/zrevrange/
- Official Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/

## Issues Found

### 1. Incorrect BYLEX upper boundary in lexicographic examples

**What was wrong:** The BYLEX examples used `[d` as an inclusive upper bound and `(d` as an exclusive upper bound, expecting "dave" to be included with `[d`. However, lexicographic comparison treats `[d` as the exact string "d", and since "dave" > "d" (longer strings with the same prefix sort after the prefix), "dave" would be excluded. Both `[d` and `(d` would return only "bob" and "carol", making the inclusive vs. exclusive demonstration ineffective.

**What was changed:** Updated the upper bounds to use the full member name:
- Inclusive example: `[d` changed to `[dave` — correctly includes "dave" in the result.
- Exclusive example: `(d` changed to `(dave` — correctly excludes "dave", returning only "bob" and "carol".

This properly demonstrates the difference between inclusive `[` and exclusive `(` boundaries.

## Review Notes
- The ZRANGE syntax section uses `min max` as parameter names while the official Redis docs use `start stop`. This is not incorrect since many tutorials and the Redis docs themselves use `min`/`max` in BYSCORE context, but worth noting.
- ZREVRANGE is marked as deprecated since Redis 6.2.0 in the official docs. The post correctly notes that `ZRANGE ... REV` is preferred but could explicitly mention the deprecation status.
- All other code examples, command syntax, expected outputs, time complexity claims, and use cases are technically accurate.
