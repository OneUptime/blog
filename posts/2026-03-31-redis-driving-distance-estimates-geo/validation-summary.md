# Validation Summary: How to Calculate Driving Distance Estimates with Redis Geo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Geo commands: GEOADD, GEODIST, GEOPOS)
- Python (redis-py client library)
- Haversine distance calculation
- Road distance correction factors for ETA estimation

## Sources Consulted
- Redis GEOADD documentation: https://redis.io/docs/latest/commands/geoadd/
- Redis GEODIST documentation: https://redis.io/docs/latest/commands/geodist/
- Redis GEOPOS documentation: https://redis.io/docs/latest/commands/geopos/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/en/stable/
- redis-py GEOADD signature changes (v4.0+): list-based `[longitude, latitude, member]` format

## Issues Found
No technical issues found.

## Review Notes
- The first code block imports `math` but never uses it. This is an unused import — not a functional error, but could be removed for cleanliness.
- Temporary geo keys use fixed names (e.g., `geo:distance_calc_temp`, `geo:route_temp`), which would cause race conditions under concurrent access. Acceptable for a tutorial but worth noting for production use.
- The `is_within_service_area` function mixes pipeline and non-pipeline calls (`r.geopos` is called directly while the pipeline is being built). This is a valid pattern and works correctly, but may be surprising to readers unfamiliar with Redis pipelines.
- Redis GEODIST uses the Haversine formula assuming Earth is a perfect sphere, which can introduce up to 0.5% error in edge cases. The post's description of "precise Haversine distances" is acceptable but slightly generous.
