# Validation Summary: How to Use GEODIST in Redis to Calculate Distance Between Points

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (geospatial commands)
- GEODIST command
- GEOADD command
- Geohash encoding
- Haversine formula

## Sources Consulted
- Official Redis GEODIST documentation: https://redis.io/docs/latest/commands/geodist/
- Official Redis GEOADD documentation: https://redis.io/docs/latest/commands/geoadd/

## Issues Found

### 1. Delivery Range Check example used two different keys (BUG)
**What was wrong:** The example added `downtown-store` to the `stores` key and `customer-home` to the `customers` key, then ran `GEODIST stores downtown-store customer-home km`. Since GEODIST operates on a single key, `customer-home` would not be found in the `stores` key and the command would return `(nil)` instead of a distance.

**What was changed:** Changed both `GEOADD` calls and the `GEODIST` call to use a single key `locations` so both members exist in the same sorted set.

**Why:** GEODIST can only calculate distances between two members stored in the same sorted set key. Using separate keys for stores and customers is a common real-world pattern, but the GEODIST command requires them to be co-located in one key.

### 2. Misleading precision/accuracy claim
**What was wrong:** The Limitations section stated "Precision is limited by Geohash encoding (sub-millimeter accuracy)". While 52-bit Geohash resolution is indeed sub-millimeter, this omits the more significant error source: Redis assumes the Earth is a perfect sphere, which can introduce errors up to 0.5% in edge cases. This is explicitly documented in the official Redis docs for both GEODIST and GEOADD.

**What was changed:** Replaced with "Assumes a perfect sphere, so errors up to 0.5% are possible in edge cases" to match the official documentation.

**Why:** The 0.5% error from the spherical Earth model is the dominant accuracy limitation and is the figure the Redis documentation highlights. Omitting it while claiming "sub-millimeter accuracy" was misleading.

## Review Notes
- The syntax, default unit (meters), nil behavior for missing members, and supported units (m, km, ft, mi) are all verified correct against official Redis documentation.
- The Haversine formula claim is not mentioned on the GEODIST docs page itself, but is confirmed on the GEOADD documentation page which describes the Earth model used across all geo commands. This is technically accurate.
- The term "great-circle distance" is not used in the Redis docs but is mathematically correct for the Haversine formula output. This is a reasonable inference, not an error.
- The GEOADD syntax used (longitude before latitude) is correct per official docs.
- Distance output values (e.g., 1143.4722 km for NY-Chicago) appear reasonable and are internally consistent (the meters example is 1000x the km example).
