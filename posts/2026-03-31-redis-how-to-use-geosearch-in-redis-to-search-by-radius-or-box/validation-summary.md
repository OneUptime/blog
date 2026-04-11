# Validation Summary: How to Use GEOSEARCH in Redis to Search by Radius or Box

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 6.2+ (GEOSEARCH, GEOADD, GEOSEARCHSTORE commands)
- Python (redis-py client library)
- Geospatial indexing and search (radius and bounding box queries)

## Sources Consulted
- Redis official documentation for GEOSEARCH: https://redis.io/docs/latest/commands/geosearch/
- Redis official documentation for GEOADD: https://redis.io/docs/latest/commands/geoadd/
- Redis geospatial data type documentation: https://redis.io/docs/latest/develop/data-types/geospatial/
- redis-py library API for `geosearch()` and `geoadd()` method signatures and return formats

## Issues Found

1. **Comment/command radius mismatch (line 30)**: The comment said "Find all restaurants within 500 meters of Times Square" but the GEOSEARCH command used `BYRADIUS 300 m`. Fixed the comment to say "300 meters" to match the actual command.

2. **Incorrect longitude-to-km conversion in viewport search (line 151)**: The viewport search function used `abs(max_lon - min_lon) * 111` to convert longitude degrees to kilometers. The value 111 km/degree is only accurate for latitude. For longitude, the correct formula is `111 * cos(latitude)` because meridians converge toward the poles. At NYC's latitude (~40.75 degrees), this error would overestimate the width by ~32% (111 vs ~84 km/degree). Fixed by adding `math.cos(math.radians(center_lat))` to the width calculation.

## Review Notes
- The GEOSEARCH syntax, options table, and all Redis CLI examples are accurate for Redis 6.2+.
- The redis-py `geosearch()` API usage (parameter names: `longitude`, `latitude`, `radius`, `width`, `height`, `unit`, `sort`, `count`, `withcoord`, `withdist`) is correct for redis-py 4.x+.
- The `geoadd()` flat-list format `[lon, lat, member, ...]` is correct for redis-py 4.x+.
- The return value unpacking (`item[0]` = name, `item[1]` = distance as float, `item[2]` = (lon, lat) tuple) is correct when `withdist=True` and `withcoord=True`.
- The deprecation information about GEORADIUS/GEORADIUSBYMEMBER in favor of GEOSEARCH as of Redis 6.2 is accurate.
- The sample output distances are illustrative and approximately consistent with the input coordinates.
