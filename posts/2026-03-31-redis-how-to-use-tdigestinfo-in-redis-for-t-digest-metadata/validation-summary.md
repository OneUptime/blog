# Validation Summary: How to Use TDIGEST.INFO in Redis for T-Digest Metadata

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (RedisBloom / Redis Stack T-Digest module)
- TDIGEST.INFO, TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.QUANTILE commands
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for TDIGEST.INFO: https://redis.io/docs/latest/commands/tdigest.info/
- Redis official documentation for TDIGEST.CREATE: https://redis.io/docs/latest/commands/tdigest.create/
- Redis official documentation for TDIGEST.ADD: https://redis.io/docs/latest/commands/tdigest.add/
- Redis official documentation for TDIGEST.QUANTILE: https://redis.io/docs/latest/commands/tdigest.quantile/

## Issues Found
1. **Missing `Observations` field in TDIGEST.INFO output**: The sample output and the field description table were both missing the `Observations` field, which is returned by TDIGEST.INFO between `Unmerged weight` and `Total compressions`. This field reports the total number of observations added to the sketch. Added the field to both the sample output (with correct numbering) and the description table.

## Review Notes
- The memory estimation formula (`compression * 64 bytes`) is presented as a rough approximation. Actual memory usage depends on implementation internals and data distribution; the formula gives a reasonable ballpark but users should rely on the `Memory usage` field from TDIGEST.INFO for accurate figures.
- The Python code uses `r.execute_command()` for all T-Digest commands, which is correct since redis-py may not have native method wrappers for all T-Digest commands depending on the version used.
- The `audit_all_digests` function uses `r.keys()` which is fine for examples but should be replaced with `r.scan_iter()` in production to avoid blocking the Redis server on large keyspaces. This is a best-practice note, not a correctness issue.
- The COMPRESSION parameter in TDIGEST.CREATE is optional (defaults to 100); the post uses it explicitly in all examples which is fine but doesn't mention the default.
