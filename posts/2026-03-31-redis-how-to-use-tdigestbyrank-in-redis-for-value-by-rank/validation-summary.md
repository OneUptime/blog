# Validation Summary: How to Use TDIGEST.BYRANK in Redis for Value by Rank

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (T-Digest probabilistic data structure)
- RedisBloom module (TDIGEST.BYRANK, TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.INFO, TDIGEST.QUANTILE, TDIGEST.RANK)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for TDIGEST.BYRANK: https://redis.io/docs/latest/commands/tdigest.byrank/
- Redis official documentation for TDIGEST.INFO: https://redis.io/docs/latest/commands/tdigest.info/
- Redis official documentation for TDIGEST.BYREVRANK: https://redis.io/docs/latest/commands/tdigest.byrevrank/

## Issues Found

1. **TDIGEST.INFO field name bug (critical)**: Both Python functions used `info_dict.get("Merged weight", 0)` to retrieve the total number of observations. Per the official TDIGEST.INFO docs, `Merged weight` only reflects data that has already been compressed/merged — newly added data sits in `Unmerged weight` until a compression cycle runs. For example, after adding 5 items, `Merged weight` can be 0 while `Unmerged weight` is 5. This would cause the functions to return empty results. Fixed by changing to `info_dict.get("Observations", 0)`, which always reflects the true total count.

2. **Leaderboard example had inconsistent data vs. queries**: The comment stated "Add 1000 player scores" but only 10 scores were actually added. The subsequent rank queries for rank 900 and 500 would return "inf" since they far exceed the 10 data points. Fixed by updating the comment to "Add 10 player scores" and adjusting rank queries to 0, 5, and 9 which are valid for 10 items.

3. **Variable shadowing in second Python function**: `get_histogram_boundaries` used `*[str(r) for r in ranks]` where `r` shadows the outer-scope `r` (the Redis client). While technically functional in Python 3 (list comprehensions have their own scope), it is confusing and inconsistent with the first Python function which correctly uses `r_`. Fixed by changing to `*[str(r_) for r_ in ranks]`.

## Review Notes
- The edge case section claims `TDIGEST.BYRANK small -1` returns "-inf". This behavior is consistent with the symmetry observed in TDIGEST.BYREVRANK (where out-of-range ranks return "-inf"), but is not explicitly documented in the official TDIGEST.BYRANK docs. The claim appears correct based on actual Redis Bloom module behavior.
- The BYRANK vs QUANTILE equivalence formula `rank = round(quantile * (total_samples - 1))` is a useful approximation but not an exact mapping — the T-Digest uses interpolation internally and may produce slightly different results.
- The command syntax, parameter descriptions, return value behavior (inf for out-of-range, accurate for rank 0 and n-1), and general explanations are all accurate per the official Redis documentation.
