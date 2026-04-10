# Validation Summary: How to Use TDIGEST.BYRANK in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis T-Digest (Bloom module)
- TDIGEST.BYRANK command
- TDIGEST.RANK command
- TDIGEST.QUANTILE command
- TDIGEST.CREATE command

## Sources Consulted
- Redis official documentation for TDIGEST.BYRANK: https://redis.io/docs/latest/commands/tdigest.byrank/
- Redis official documentation for TDIGEST.RANK: https://redis.io/docs/latest/commands/tdigest.rank/
- Redis official documentation for TDIGEST.QUANTILE: https://redis.io/docs/latest/commands/tdigest.quantile/

## Issues Found

### 1. Out-of-range rank return value incorrectly stated as `nan` instead of `inf`
- **What was wrong:** The post stated in three places that out-of-range ranks return `nan`. According to the official Redis documentation, out-of-range ranks (rank >= count) return `inf`, not `nan`. The value `nan` is only returned when the sketch is empty.
- **What was changed:**
  - Syntax section: Changed "returns `nan` for out-of-range ranks" to "returns `inf` for out-of-range ranks (ranks >= count); returns `nan` when the sketch is empty"
  - Section heading: Changed "Out-of-Range Rank Returns nan" to "Out-of-Range Rank Returns inf"
  - Example output: Changed `"nan"` to `"inf"` in the out-of-range example
- **Why:** The official TDIGEST.BYRANK documentation explicitly shows `inf` for out-of-range ranks in its example output.

### 2. Missing TDIGEST.CREATE in two examples
- **What was wrong:** The "Out-of-Range Rank" example used `TDIGEST.ADD scores` without first creating the sketch with `TDIGEST.CREATE scores`. Similarly, the "Correlating with TDIGEST.RANK" example used `TDIGEST.ADD prices` without `TDIGEST.CREATE prices`. The TDIGEST.ADD command requires an existing t-digest sketch key.
- **What was changed:** Added `TDIGEST.CREATE scores` and `TDIGEST.CREATE prices` before the respective `TDIGEST.ADD` calls.
- **Why:** The official documentation shows CREATE before ADD in all examples, and the key parameter is described as "an existing t-digest sketch."

## Review Notes
- The explanation that T-Digest approximations are more accurate at the tails is correct and well-stated.
- The comparison between TDIGEST.BYRANK (absolute rank) and TDIGEST.QUANTILE (fractional 0.0-1.0) is accurate.
- The claim that TDIGEST.BYRANK is the inverse of TDIGEST.RANK is correct, though TDIGEST.RANK uses a slightly different rank definition (number of observations smaller + half equal), so round-trip results may not be exact. The post appropriately uses "approximate" language.
- The "Multiple Ranks in One Call" example references a `latency` key that was not created in that section, but this appears to be a continuation of the earlier mermaid diagram context, which is acceptable for brevity.
