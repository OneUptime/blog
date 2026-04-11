# Validation Summary: How Redis Geospatial Indexes Work Internally (Sorted Sets + Geohash)

## Status
validated

## Post Type
Tutorial / Technical deep-dive

## Technologies Covered
- Redis (geospatial commands: GEOADD, GEODIST, GEOHASH, GEOPOS, GEOSEARCH, GEORADIUS)
- Geohash encoding algorithm
- Redis Sorted Sets (internal data structure for geo keys)
- Python redis-py client library

## Sources Consulted
- Redis GEOSEARCH documentation: https://redis.io/docs/latest/commands/geosearch/
- Redis GEOADD documentation: https://redis.io/docs/latest/commands/geoadd/
- Redis GEORADIUS documentation: https://redis.io/docs/latest/commands/georadius/
- Redis GEOHASH documentation: https://redis.io/docs/latest/commands/geohash/
- Redis GEODIST documentation: https://redis.io/docs/latest/commands/geodist/
- Redis Geospatial data types guide: https://redis.io/docs/latest/develop/data-types/geospatial/
- redis-py library documentation: https://redis.readthedocs.io/en/stable/

## Issues Found

### 1. Incorrect time complexity claim in Summary section
- **What was wrong:** The summary stated "This gives spatial queries the same O(log n) performance as sorted set range operations," implying all geo operations are O(log n). GEOSEARCH is actually O(N+log M) per the Redis documentation, where N is the number of elements in the bounding box area and M is the number of items in the sorted set.
- **What was changed:** Replaced the blanket O(log n) claim with accurate complexity: "Point operations like `GEOADD` run in O(log N), while search commands like `GEOSEARCH` run in O(N+log M) where N is the number of elements scanned in the bounding box and M is the number of items in the set."
- **Why:** The original claim was misleading. GEOADD, GEODIST, GEOPOS, and GEOHASH are O(log N), but GEOSEARCH (the primary search command) has a different, higher complexity.

### 2. GEORADIUS listed without deprecation note
- **What was wrong:** The introduction listed `GEORADIUS` alongside current commands without noting it has been deprecated since Redis 6.2.0.
- **What was changed:** Added parenthetical "(deprecated since 6.2 in favor of `GEOSEARCH`)" after the GEORADIUS mention.
- **Why:** The blog already discusses Redis 6.2+ features (GEOSEARCH, BYBOX), so listing GEORADIUS as a current command without noting deprecation is misleading. The Redis documentation explicitly marks it as deprecated.

### 3. Incorrect latitude range for Redis geohash encoding
- **What was wrong:** The geohash encoding diagram showed "Latitude -90..+90 -> 26 bits". Redis actually restricts valid latitudes to -85.05112878 to +85.05112878 degrees (the Mercator projection limit per EPSG:900913).
- **What was changed:** Updated to "Latitude -85.05112878..+85.05112878 -> 26 bits".
- **Why:** Per the GEOADD documentation, Redis rejects coordinates outside this range. The standard geohash algorithm uses -90 to +90, but since the post is specifically about Redis's implementation, the Redis-specific limit is the correct value.

## Review Notes
- The `listpack` encoding mentioned for small sorted sets is correct for Redis 7.0+. Prior to Redis 7.0, the compact encoding was called `ziplist`. Since the blog is written in 2026 and covers Redis 6.2+ features, this is acceptable but readers on older Redis versions (6.x) would see `ziplist` instead.
- The GEOHASH return value "sqc8b59zny0" for Palermo could not be independently verified without running Redis, but the format (11-character base32 string) is correct per the documentation.
- The GEODIST values (166.2742 km for Palermo-Catania, 1855732.9620 m for Palermo-Paris) are plausible based on geographic calculation.
- The Python redis-py code example uses correct API signatures for modern redis-py (>= 4.x). The `geoadd` call with a tuple `(lon, lat, name)` and the `geosearch` call with keyword arguments are both valid.
- The precision claim of ~0.6mm at the equator for 52 bits is correct (Earth circumference ~40,075 km / 2^26 ~ 0.6mm).
