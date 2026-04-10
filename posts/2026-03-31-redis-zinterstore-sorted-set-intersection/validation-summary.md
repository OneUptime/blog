# Validation Summary: How to Use ZINTERSTORE in Redis for Sorted Set Intersection

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (sorted sets)
- ZINTERSTORE command
- ZINTER (non-storing variant, Redis 6.2+)
- ZUNIONSTORE (comparison)
- ZRANGE, ZREVRANGE, ZCARD (used in examples)

## Sources Consulted
- Official Redis ZINTERSTORE documentation: https://redis.io/docs/latest/commands/zinterstore/
- Official Redis ZINTER documentation: https://redis.io/docs/latest/commands/zinter/
- Official Redis ZREVRANGE documentation: https://redis.io/docs/latest/commands/zrevrange/

## Issues Found

### Issue 1: Incorrect time complexity
- **What was wrong:** The Performance Considerations section stated the time complexity as `O(N * K log(N * K))` where N is the size of the smallest set and K is the number of sets.
- **What was changed:** Corrected to `O(N*K)+O(M*log(M))` where N is the size of the smallest input sorted set, K is the number of input sorted sets, and M is the number of elements in the resulting sorted set, matching the official Redis documentation.
- **Why:** The original complexity formula was incorrect — it conflated two separate additive terms into one and omitted the variable M (result set size), which is distinct from N and K.

### Issue 2: Incorrect ZREVRANGE output ordering
- **What was wrong:** In the "Users Who Are Active in All Channels" example, the ZREVRANGE output showed u1 (score 21) before u3 (score 23), which is ascending order.
- **What was changed:** Swapped the order to show u3 (score 23) first, then u1 (score 21).
- **Why:** ZREVRANGE returns members in descending score order (highest to lowest). Since u3 has a higher score (23) than u1 (21), u3 must appear first.

## Review Notes
- All arithmetic computations in every example (SUM, MIN, MAX, WEIGHTS, three-set intersection) were verified and are correct.
- The ZREVRANGE command used in examples is deprecated since Redis 6.2.0 in favor of `ZRANGE ... REV`. It still works but future-facing posts may want to use the newer syntax.
- The comparison table between ZINTERSTORE and ZUNIONSTORE is accurate.
- The note about ZINTER being available since Redis 6.2+ is correct (specifically 6.2.0).
