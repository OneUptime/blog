# Validation Summary: How to Use TDIGEST.RANK in Redis for Rank Estimation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom module)
- T-Digest probabilistic data structure
- TDIGEST.RANK command
- TDIGEST.CDF, TDIGEST.ADD, TDIGEST.CREATE, TDIGEST.INFO commands
- Python redis-py client

## Sources Consulted
- Redis official documentation for TDIGEST.RANK: https://redis.io/commands/tdigest.rank/
- Redis official documentation for TDIGEST.CDF: https://redis.io/commands/tdigest.cdf/
- Redis official documentation for TDIGEST.INFO: https://redis.io/commands/tdigest.info/
- Redis official documentation for TDIGEST.CREATE: https://redis.io/commands/tdigest.create/
- redis-py client library documentation: https://github.com/redis/redis-py

## Issues Found
1. **Wrong rank semantics throughout the post**: The post stated TDIGEST.RANK returns the count of values "less than or equal to" the queried value. Per the Redis documentation, it returns the count of values strictly "smaller than" the queried value. Fixed all instances of "less than or equal to" / "at or below" to "smaller than" / "below".

2. **Incorrect rank value for 50 in Basic Usage**: With values 10–100, the rank of 50 should be 4 (values 10, 20, 30, 40 are strictly less than 50), not 5. Fixed in both the single-query and multi-query examples.

3. **Incorrect claim about negative rank return value**: The post stated TDIGEST.RANK returns -1 for values below all elements. Per the Redis documentation, the minimum value has rank 0, and values below all elements also return 0. Removed the -1 claim and updated the section title from "Negative Rank Handling" to "Rank for Out-of-Range Values".

4. **Wrong rank numbers in Comparing Multiple Values section**: For the dataset (12, 18, 23, 45, 67, 88, 110, 250, 340, 490, 980, 1200), the rank of 100 should be 6 (not 7) and the rank of 200 should be 7 (not 10). With compression 200 and only 12 values, the t-digest stores exact centroids. Fixed the expected output and the difference calculation (1 sample between 100 and 200, not 3).

5. **TDIGEST.INFO Python code used only "Merged weight"**: Using only "Merged weight" from TDIGEST.INFO may miss unmerged observations. Fixed to sum both "Merged weight" and "Unmerged weight" for an accurate total count. Updated the corresponding bash comment as well.

6. **CDF vs RANK equivalence overstated**: Changed "These are equivalent" to "These are approximately equivalent" since TDIGEST.CDF computes (count smaller + half count equal) / total, which differs slightly from RANK / total.

## Review Notes
- The Python examples use `execute_command()` for T-Digest operations, which is correct since redis-py does not have native high-level methods for RedisBloom T-Digest commands unless the `redis[bloom]` extra is installed.
- The `decode_responses=True` parameter works correctly with TDIGEST commands — integer return values from TDIGEST.RANK remain as integers.
- The simulated example output (rank 920 for score 7000 in a normal distribution around 5000) is reasonable for illustration purposes, though actual values would vary per run.
- TDIGEST.RANK requires the RedisBloom module (version 2.4.0+). The post does not mention this prerequisite, but this is consistent with other T-Digest posts in the series.
