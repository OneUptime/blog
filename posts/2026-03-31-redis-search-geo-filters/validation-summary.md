# Validation Summary: How to Use Geo Filters in Redis Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (Redis Search and Query)
- GEO field type and geo-spatial queries
- FT.CREATE, FT.SEARCH, FT.AGGREGATE commands
- geodistance aggregation function

## Sources Consulted
- [FT.AGGREGATE | Redis Docs](https://redis.io/docs/latest/commands/ft.aggregate/) - Verified geodistance function syntax, LOAD syntax, and APPLY expressions
- [Geospatial queries | Redis Docs](https://redis.io/docs/latest/develop/ai/search-and-query/query/geo-spatial/) - Verified geo filter query syntax and units
- [Field and type options | Redis Docs](https://redis.io/docs/latest/develop/ai/search-and-query/indexing/field-and-type-options/) - Verified GEO field options including SORTABLE support
- [Aggregations | Redis Docs](https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/aggregations/) - Verified geodistance function signatures and return unit (meters)
- [RediSearch geodistance PR #1246](https://github.com/RediSearch/RediSearch/pull/1246) - Confirmed geodistance returns meters and verified function signatures

## Issues Found

### 1. Wrong function name: `geodist` should be `geodistance`
- **What was wrong:** The APPLY expressions used `geodist(@location, ...)` as the function name in two places (Sorting by Distance section and Store Locator example).
- **What was changed:** Replaced `geodist` with `geodistance` in both APPLY expressions.
- **Why:** The correct RediSearch aggregation function name is `geodistance`, not `geodist`. `GEODIST` is a separate Redis command for sorted sets, not the FT.AGGREGATE APPLY function.

### 2. Wrong return unit claim for geodistance
- **What was wrong:** The post stated "The GEODISTANCE function returns the distance in kilometers" and used `distance_km` as the variable name throughout.
- **What was changed:** Updated the explanation to state that `geodistance` returns distance in meters. Renamed `distance_km` to `distance_m` in all APPLY expressions and example output. Updated sample output values from "0.01"/"0.62" (km) to "0.00"/"644.25" (meters).
- **Why:** Per official Redis documentation and the original implementation PR, `geodistance` returns meters by default.

### 3. Incorrect claim that GEO does not support SORTABLE
- **What was wrong:** The Limitations section stated "GEO does not support SORTABLE (use GEODISTANCE in aggregations instead)."
- **What was changed:** Replaced with "To sort results by distance, use `geodistance` in `FT.AGGREGATE` aggregations" which provides correct guidance without making a false claim.
- **Why:** Per the official Redis FT.CREATE documentation, GEO fields DO support the SORTABLE option. The original claim was factually incorrect.

## Review Notes
- The claim "Maximum supported radius is approximately 6000 km" could not be verified against official documentation. No official source confirms or denies this specific limit. It was left as-is since it cannot be definitively disproven, but readers should verify this against their Redis version.
- The post uses `--` for inline comments in Redis command blocks. Redis CLI does not support comments, but this is an acceptable documentation convention for blog posts.
- The GEOSHAPE field type (available since Redis 7.2+) supports polygon and other shape queries, which could be mentioned as an alternative to the radius-only GEO type for readers needing more complex geospatial filtering. This is not an error, just a potential future enhancement.
