# Validation Summary: How to Use TDIGEST.ADD in Redis to Add Samples to a T-Digest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom module, T-Digest data structure)
- TDIGEST.ADD, TDIGEST.CREATE, TDIGEST.QUANTILE, TDIGEST.INFO commands
- Python (redis-py client)
- Node.js (node-redis client)

## Sources Consulted
- Redis official documentation for TDIGEST.ADD: https://redis.io/docs/latest/commands/tdigest.add/
- Redis official documentation for TDIGEST.INFO: https://redis.io/docs/latest/commands/tdigest.info/
- Redis official documentation for TDIGEST.CREATE: https://redis.io/docs/latest/commands/tdigest.create/
- Python `random.lognormvariate` documentation: https://docs.python.org/3/library/random.html#random.lognormvariate

## Issues Found
1. **Incorrect time complexity**: The post stated TDIGEST.ADD has O(n log n) complexity. The official Redis documentation states the complexity is O(N). Fixed "O(n log n)" to "O(n)" in the Performance Considerations section.
2. **Incorrect statistical terminology**: The Python example comment stated `random.lognormvariate(3.5, 0.8)` has "mean ~33ms". The value e^3.5 ~ 33ms is the *median* of the lognormal distribution, not the mean. The mean is e^(mu + sigma^2/2) = e^3.82 ~ 46ms. Fixed "mean" to "median" in the code comment.

## Review Notes
- The Python and Node.js examples use the lower-level `execute_command` / `sendCommand` APIs rather than the dedicated T-Digest methods available in redis-py (`r.tdigest().add()`) and node-redis (`client.tDigest.add()`). Both approaches work correctly, but the dedicated methods are the more idiomatic approach. This is a style preference, not an error.
- The post correctly requires TDIGEST.CREATE before TDIGEST.ADD in all examples, which matches the documented behavior (TDIGEST.ADD returns an error if the key does not exist).
- The TDIGEST.INFO field names ("Merged nodes", "Unmerged nodes", "Merged weight") are accurate per official documentation.
- The syntax `TDIGEST.ADD key value [value ...]` is correct for RedisBloom >= 2.4 (which dropped the older value-weight pair syntax).
