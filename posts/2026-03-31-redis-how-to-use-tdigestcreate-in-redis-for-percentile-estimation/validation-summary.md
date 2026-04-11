# Validation Summary: How to Use TDIGEST.CREATE in Redis for Percentile Estimation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack
- RedisBloom module (T-Digest data structure)
- Python (redis-py client)
- Lua scripting in Redis

## Sources Consulted
- Redis TDIGEST.CREATE official documentation: https://redis.io/commands/tdigest.create/
- Redis TDIGEST.INFO official documentation: https://redis.io/docs/latest/commands/tdigest.info/
- Redis T-Digest general documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/t-digest/
- RedisBloom t-digest-c source code: https://github.com/RedisBloom/t-digest-c
- T-Digest centroid bounds discussion (tdunning/t-digest#77): https://github.com/tdunning/t-digest/issues/77

## Issues Found
1. **Incorrect capacity formula**: The post stated `max_centroids = compression * pi / 2 (approximately)` as the formula for maximum centroids. This is incorrect. The actual formula used in Redis's t-digest-c implementation is `capacity = compression * 6 + 10`. For compression=100 this yields 610, which matches the TDIGEST.INFO output shown later in the same post (but contradicted the pi/2 formula, which would give ~157). Fixed the formula and added a concrete example showing that compression=100 produces capacity=610.

## Review Notes
- The TDIGEST.INFO output shown in the post may be missing some fields present in newer RedisBloom versions (e.g., "Observations" and "Memory usage"), but the fields shown are correct for the version implied.
- The Python example uses `r.execute_command()` which is valid but lower-level. The redis-py library also offers a higher-level `r.tdigest().create()` API, though the execute_command approach shown is perfectly functional.
- The Lua script for atomic check-and-create is a sound pattern and correctly implemented.
- All Redis command syntax, key naming conventions, and general T-Digest explanations are accurate.
