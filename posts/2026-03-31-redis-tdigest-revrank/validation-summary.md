# Validation Summary: How to Use TDIGEST.REVRANK in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (T-Digest data structure)
- TDIGEST.REVRANK command
- TDIGEST.RANK command (comparison)
- TDIGEST.BYREVRANK command (comparison)
- TDIGEST.CREATE and TDIGEST.ADD commands

## Sources Consulted
- Official Redis documentation for TDIGEST.REVRANK: https://redis.io/docs/latest/commands/tdigest.revrank/
- Official Redis documentation for TDIGEST.RANK: https://redis.io/docs/latest/commands/tdigest.rank/
- Official Redis documentation for TDIGEST.BYREVRANK: https://redis.io/docs/latest/commands/tdigest.byrevrank/

## Issues Found

1. **Off-by-one error in REVRANK vs RANK comparison example (line 159):**
   - **What was wrong:** The comment said "Returns: 49 (49th slowest)" for a reverse rank of 49. Since reverse rank is zero-based (rank 0 = 1st slowest, rank 1 = 2nd slowest), reverse rank 49 corresponds to the 50th slowest, not the 49th. This was also inconsistent with the post's own earlier example where reverse rank 1 is correctly described as "the second slowest request."
   - **What was changed:** Updated "49th slowest" to "50th slowest."
   - **Why:** Zero-based indexing means rank N = (N+1)th position. The fix maintains consistency with the rest of the post and prevents reader confusion about zero-based vs one-based ranking.

## Review Notes
- The inline `--` comments used in Redis command examples (e.g., `-- How bad was the 890ms request?`) are not valid Redis CLI syntax. This is a common blog convention and unlikely to cause issues, but readers who copy-paste entire blocks may encounter errors on those lines.
- All return values for small datasets (5-7 values) were verified against the REVRANK formula: (number of observations larger than value) + (half the number of observations equal to value). Results are correct for the examples given.
- The comparison table between TDIGEST.RANK and TDIGEST.REVRANK correctly mirrors the edge case behaviors documented in official Redis docs.
- The TDIGEST.CREATE command is used without the optional COMPRESSION parameter, which correctly defaults to 100.
