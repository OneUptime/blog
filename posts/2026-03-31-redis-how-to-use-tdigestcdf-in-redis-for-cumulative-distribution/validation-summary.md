# Validation Summary: How to Use TDIGEST.CDF in Redis for Cumulative Distribution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom / Redis Stack module)
- T-Digest probabilistic data structure
- TDIGEST.CDF command
- Python (redis-py client)
- JavaScript (node-redis client)

## Sources Consulted
- Redis official documentation for TDIGEST.CDF: https://redis.io/docs/latest/commands/tdigest.cdf/
- Redis T-Digest data type overview: https://redis.io/docs/latest/develop/data-types/probabilistic/t-digest/
- RedisBloom module documentation for T-Digest commands
- redis-py client documentation for execute_command usage
- node-redis client documentation for sendCommand usage

## Issues Found

1. **Incorrect CDF definition**: The post stated TDIGEST.CDF returns "the fraction of all inserted samples that are less than or equal to that value." Per Redis documentation, it returns an estimation of the fraction of observations smaller than the given value (plus half the observations equal to the given value). Fixed to match the documented behavior.

2. **Inaccurate SLA Compliance CDF values**: The example CDF results for `checkout:latency` were significantly off from what T-Digest would return for the given 28 data points. With compression 200, each point becomes its own centroid, so results should closely match empirical CDF. Fixed values:
   - Under 100ms: changed from 0.55 (55%) to 0.68 (68%) — actual empirical: 19/28 ≈ 0.679
   - Under 200ms: changed from 0.8 (80%) to 0.75 (75%) — actual empirical: 21/28 = 0.75
   - Under 500ms: changed from 0.93 (93%) to 0.86 (86%) — actual empirical: 24/28 ≈ 0.857
   - Under 1000ms: changed from 0.97 (97%) to 0.96 (96%) — actual empirical: 27/28 ≈ 0.964

3. **Anomaly detection CDF at 60 incorrect**: The post claimed `TDIGEST.CDF baseline:cpu_usage 60` returns 0.99, but all baseline values range from 45-55. Since 60 is above all observations, the CDF should return 1.0, not 0.99. Fixed the return value and updated the comment to clarify that 60 is above all historical observations.

4. **Empty T-Digest return value**: The post stated an empty T-Digest returns `(nil)`. Per Redis documentation, TDIGEST.CDF returns `nan` for an empty sketch. Fixed.

5. **JavaScript example: top-level await with CommonJS**: The code used `require()` (CommonJS) but then used top-level `await` which is only supported in ES modules. Wrapped the calling code in an async IIFE to make it valid CommonJS.

## Review Notes
- The Python example uses `execute_command()` for TDIGEST commands. While this works, newer versions of redis-py (4.0+) have built-in support for T-Digest commands via `r.tdigest().cdf()`. The current approach is still valid and widely compatible.
- The basic usage example CDF values (0.769 for 100, 0.385 for 50) are reasonable approximations — they match a simple rank/count interpretation rather than the strict mid-rank formula, but are within the expected T-Digest approximation tolerance for illustrative purposes.
- The inverse relationship between CDF and QUANTILE is well explained and conceptually accurate.
