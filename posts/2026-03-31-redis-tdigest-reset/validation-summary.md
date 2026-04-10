# Validation Summary: How to Use TDIGEST.RESET in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom (T-Digest data structure)
- TDIGEST.RESET, TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.INFO, TDIGEST.QUANTILE commands

## Sources Consulted
- https://redis.io/docs/latest/commands/tdigest.reset/ — official TDIGEST.RESET command reference (syntax, return values, time complexity)
- https://redis.io/docs/latest/commands/tdigest.info/ — TDIGEST.INFO output field ordering
- https://redis.io/docs/latest/commands/tdigest.add/ — TDIGEST.ADD behavior (requires existing key)
- https://redis.io/docs/latest/commands/tdigest.quantile/ — TDIGEST.QUANTILE return values on empty sketches

## Issues Found

### 1. Incorrect time complexity claim
- **What was wrong:** The Performance Considerations section stated `TDIGEST.RESET` is O(N) where N is the number of centroids. The official Redis documentation states the time complexity is O(1), and the command is categorized under the `@fast` ACL category.
- **What was changed:** Corrected to O(1) and removed the incorrect justification about freeing centroid memory. Changed "significantly faster" to "faster" for the comparison with DEL + CREATE.
- **Why:** Accuracy with official documentation.

### 2. Missing TDIGEST.CREATE before TDIGEST.ADD in "Confirm Data Is Gone" example
- **What was wrong:** The example used `TDIGEST.ADD scores 100 200 300` without first creating the sketch with `TDIGEST.CREATE`. According to the official docs, `TDIGEST.ADD` requires an existing T-Digest key and returns an error if the key does not exist. It does not auto-create sketches.
- **What was changed:** Added `TDIGEST.CREATE scores COMPRESSION 100` before the `TDIGEST.ADD` call.
- **Why:** The example would fail as written since TDIGEST.ADD does not auto-create keys.

### 3. Incorrect TDIGEST.INFO output positions in "Compression is Preserved" example
- **What was wrong:** The output showed "Observations" at positions 3-4, but TDIGEST.INFO returns "Observations" at positions 13-14 (after Compression, Capacity, Merged nodes, Unmerged nodes, Merged weight, and Unmerged weight fields).
- **What was changed:** Corrected the output to show positions 1-2 for Compression and 13-14 for Observations, with `...` to indicate omitted fields in between.
- **Why:** Consistency with actual TDIGEST.INFO output and with the earlier "Basic Reset" example in the same post, which correctly showed positions 13-14.

## Review Notes
- The post uses `--` comment syntax in Redis command blocks for illustration. Redis CLI does not support inline comments, so readers copying commands should strip these. This is a common convention in Redis tutorials and not flagged as an error.
- The claim that compression is preserved after reset is consistent with expected behavior (the docs say the sketch is "re-initialized"), but is not explicitly documented. The post's examples correctly demonstrate this.
