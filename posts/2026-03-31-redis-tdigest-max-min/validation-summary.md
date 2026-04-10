# Validation Summary: How to Use TDIGEST.MAX and TDIGEST.MIN in Redis

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis T-Digest (RedisBloom module)
- T-Digest probabilistic data structure
- Commands: TDIGEST.MAX, TDIGEST.MIN, TDIGEST.ADD, TDIGEST.CREATE, TDIGEST.MERGE, TDIGEST.BYRANK, TDIGEST.QUANTILE

## Sources Consulted
- Official Redis documentation for TDIGEST.MIN: https://redis.io/commands/tdigest.min/
- Official Redis documentation for TDIGEST.MAX: https://redis.io/commands/tdigest.max/
- Official Redis documentation for TDIGEST.ADD: https://redis.io/commands/tdigest.add/
- Official Redis documentation for TDIGEST.CREATE: https://redis.io/commands/tdigest.create/
- Official Redis documentation for TDIGEST.MERGE: https://redis.io/commands/tdigest.merge/
- Official Redis documentation for TDIGEST.BYRANK: https://redis.io/commands/tdigest.byrank/
- Official Redis documentation for TDIGEST.QUANTILE: https://redis.io/commands/tdigest.quantile/

## Issues Found

### Issue 1: TDIGEST.BYRANK at edge ranks incorrectly described as approximate
- **Location:** "TDIGEST.MAX / TDIGEST.MIN vs TDIGEST.BYRANK" section
- **What was wrong:** The post stated that `TDIGEST.BYRANK` at rank 0 and rank N-1 returns approximations. The official Redis documentation explicitly states that these edge ranks return "an accurate result" (the smallest and largest observations respectively). Only intermediate ranks are approximate.
- **What was changed:** Updated the explanation to clarify that edge ranks (0 and N-1) return exact results, and that `TDIGEST.MIN`/`TDIGEST.MAX` are preferred for clarity of intent. Removed the `~` prefix from the return values in the code example and changed the "Approximate" comment to reflect that edge ranks are exact.

### Issue 2: TDIGEST.QUANTILE at 0.0 and 1.0 incorrectly described as approximate
- **Location:** "TDIGEST.MAX / TDIGEST.MIN vs TDIGEST.QUANTILE" section
- **What was wrong:** The post stated that `TDIGEST.QUANTILE` at 0.0 "approximates the minimum" and at 1.0 "approximates the maximum." The official Redis documentation states that quantile 0 and quantile 1 return "an accurate result."
- **What was changed:** Updated the comments to say "returns the exact minimum" and "returns the exact maximum" instead of "approximates."

## Review Notes
- All other technical claims verified as correct: O(1) complexity, `nan` return for empty sketches, TDIGEST.MERGE syntax with numkeys parameter, and TDIGEST.ADD accepting multiple values.
- The TDIGEST.CREATE examples correctly omit the optional COMPRESSION parameter (which defaults to 100), which is appropriate for this tutorial's scope.
- The claim that min/max are "stored separately in the sketch structure" is consistent with the T-Digest data structure design and the O(1) complexity documented by Redis, though the Redis docs do not explicitly state this implementation detail.
