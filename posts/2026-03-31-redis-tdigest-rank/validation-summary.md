# Validation Summary: How to Use TDIGEST.RANK in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis T-Digest (RedisBloom module)
- TDIGEST.RANK command
- TDIGEST.CDF command (comparison)
- TDIGEST.BYRANK command (inverse relationship)

## Sources Consulted
- Official Redis documentation for TDIGEST.RANK: https://redis.io/docs/latest/commands/tdigest.rank/
- Official Redis documentation for TDIGEST.CDF: https://redis.io/docs/latest/commands/tdigest.cdf/
- Official Redis documentation for TDIGEST.BYRANK: https://redis.io/docs/latest/commands/tdigest.byrank/
- Redis T-Digest overview: https://redis.io/docs/latest/develop/data-types/probabilistic/t-digest/

## Issues Found

### Issue 1: Incorrect boundary rank semantics in introduction
**What was wrong:** The introductory paragraph stated "A rank of 0 means the value is at or below the minimum; a rank of N-1 means it is at or above the maximum." This contradicts the documented behavior (and the post's own Syntax section) which states that values below the minimum return -1 and values above the maximum return N.
**What was changed:** Reworded to: "A rank of 0 corresponds to the minimum observed value; a rank of N-1 corresponds to the maximum. Values below the minimum return -1, and values above the maximum return N (the total count)."
**Why:** The original wording conflated the boundary return values (-1 and N) with normal rank values (0 and N-1), creating an internal contradiction within the post.

### Issue 2: Missing TDIGEST.CREATE in "Querying Rank on a Large Sketch" example
**What was wrong:** The example called `TDIGEST.ADD api:times ...` without first creating the sketch with `TDIGEST.CREATE api:times`. TDIGEST.ADD requires the key to already exist as a T-Digest sketch.
**What was changed:** Added `TDIGEST.CREATE api:times` before the TDIGEST.ADD call.
**Why:** Without the CREATE, the ADD command would return an error. The "Basic Rank Lookup" example correctly included CREATE, but this example omitted it.

### Issue 3: Incorrect time complexity
**What was wrong:** The Performance Considerations section stated "O(log N) per value query where N is the compression (number of centroids)." The official Redis documentation specifies O(1) per value query.
**What was changed:** Corrected to "O(1) per value query."
**Why:** The official Redis documentation lists TDIGEST.RANK complexity as O(N) where N is the number of values queried, meaning each individual value lookup is O(1).

## Review Notes
- The post simplifies the rank definition by omitting the tie-handling formula (rank = observations smaller than value + half observations equal to value). This is an acceptable simplification for a tutorial-style post but readers should be aware that ranks for values with many duplicates may not be exactly as expected from a simple "position in sorted order" mental model.
- The "Validate Sketch Distribution" example shows hypothetical output (0, 499, 999) for a calibration dataset, which implies a uniformly distributed 1000-observation sketch. This is reasonable as an illustrative example.
- The RANK vs CDF comparison code comment says "RANK returns an integer rank (0 to N-1)" which omits the -1 and N boundary returns, but this is acceptable in a brief code comment.
