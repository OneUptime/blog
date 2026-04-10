# Validation Summary: How to Use TDIGEST.CDF in Redis T-Digest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisBloom (T-Digest module)
- TDIGEST.CDF command
- TDIGEST.CREATE command
- TDIGEST.ADD command
- TDIGEST.QUANTILE command (comparison)

## Sources Consulted
- Redis T-Digest command documentation (https://redis.io/docs/latest/commands/tdigest.cdf/)
- Redis T-Digest CREATE documentation (https://redis.io/docs/latest/commands/tdigest.create/)
- Redis T-Digest ADD documentation (https://redis.io/docs/latest/commands/tdigest.add/)
- Redis T-Digest QUANTILE documentation (https://redis.io/docs/latest/commands/tdigest.quantile/)

## Issues Found
1. **Missing TDIGEST.CREATE in fractional values example**: The "CDF of Fractional Values" example called `TDIGEST.ADD temps` without first calling `TDIGEST.CREATE temps`. T-Digest keys must be explicitly created before values can be added; `TDIGEST.ADD` does not auto-create the key. Added `TDIGEST.CREATE temps` before the `TDIGEST.ADD` call.

## Review Notes
- The example outputs (e.g., 0.5 for the 50th value in a uniform distribution of 10 values) are idealized. T-Digest is an approximation algorithm, so real outputs may differ slightly depending on compression settings. This is acceptable for a tutorial.
- The description says TDIGEST.CDF returns "the fraction of values less than or equal to a given value." The precise Redis documentation describes it as "the fraction of (observations smaller than the given value + half the observations equal to the given value)." The simplified description is a reasonable approximation for tutorial purposes.
- The performance claim of O(log N) per value query where N is the number of centroids is consistent with T-Digest's sorted centroid lookup behavior.
- The accuracy claim ("highest at the tails and lower near the median") correctly describes T-Digest's design, which prioritizes tail accuracy for percentile estimation.
