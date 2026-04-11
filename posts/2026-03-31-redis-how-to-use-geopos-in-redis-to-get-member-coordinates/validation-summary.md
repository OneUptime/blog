# Validation Summary: How to Use GEOPOS in Redis to Get Member Coordinates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (geospatial commands: GEOPOS, GEOADD, GEODIST, GEOSEARCH)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for GEOPOS: https://redis.io/docs/latest/commands/geopos/
- Redis official documentation for GEOADD: https://redis.io/docs/latest/commands/geoadd/
- Redis official documentation for GEOSEARCH: https://redis.io/docs/latest/commands/geosearch/
- redis-py library API documentation
- 52-bit Geohash precision calculations (Earth circumference / 2^26 per dimension)

## Issues Found
1. **Geohash precision off by 3 orders of magnitude (3 occurrences)**: The post claimed GEOPOS precision is "within 0.6mm". A 52-bit geohash provides approximately 0.6 **meters** of precision, not 0.6 millimeters. Fixed all three occurrences (intro paragraph, Precision Note section, and Summary section) from "0.6mm" to "0.6 meters".

2. **Incorrect GEODIST example value**: The GEODIST example between "London Waterloo" (-0.1276, 51.5074) and "London Bridge" (-0.0755, 51.5040) showed a distance of "9.1234" km. Using the Haversine formula (which Redis uses), the actual distance is approximately 3.64 km. Fixed the example value from "9.1234" to "3.6414".

## Review Notes
- The Python code examples correctly use the redis-py API for `geopos` and `geosearch`. The `float()` calls on coordinates returned by `geopos` are redundant (redis-py already returns floats) but harmless.
- The GEOADD syntax correctly places longitude before latitude before member name, matching the Redis command format.
- The explanation of nil returns for non-existent members is accurate.
- The `geosearch` call in the Location API example uses correct parameter names and values for redis-py.
