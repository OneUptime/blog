# Validation Summary: How to Use Geospatial Queries in MongoDB with $near

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB geospatial queries (`$near`, `$nearSphere`, `$geoNear`, `$geoWithin`)
- MongoDB `2dsphere` and `2d` indexes
- GeoJSON format (Point type)
- MongoDB aggregation pipeline (`$geoNear` stage)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: $near query operator — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: $geoNear aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Manual: $nearSphere query operator — https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/
- MongoDB Manual: 2dsphere Indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB Manual: Geospatial Queries — https://www.mongodb.com/docs/manual/geospatial-queries/
- GeoJSON specification (RFC 7946) for coordinate ordering (longitude, latitude)

## Issues Found

### 1. Incorrect sample output distances in `$geoNear` aggregation example
**What was wrong:** The sample output showed completely inaccurate distances for the given restaurant coordinates relative to the query point (Times Square: [-73.9857, 40.7580]). The post claimed Burger Barn was 104m away (actual: ~1001m), Pasta Palace was 107m away (actual: ~1069m), and Sushi World was 847m away (actual: ~425m). The ordering was also wrong — Sushi World is the closest restaurant, not the farthest.

**What was changed:** Updated `maxDistance` in the `$geoNear` example from 1000 to 2000 (so that 3 of the 4 restaurants are within range), corrected the sample output to show accurate distances calculated via the Haversine formula, and fixed the sort order to correctly reflect closest-first ordering: Sushi World (425m), Burger Barn (1001m), Pasta Palace (1069m).

**Why:** With the original `maxDistance: 1000`, only Sushi World (~425m) would actually be returned. The original distances were off by roughly an order of magnitude, and readers attempting to reproduce the example would get entirely different results.

### 2. Incorrect `$and` restriction in Limitations section
**What was wrong:** The Limitations section claimed "$near cannot be used inside `$or`, `$and`, `$not`, or `$nor` expressions." The `$and` claim is incorrect — `$near` works fine with both implicit and explicit `$and`. The post's own "Combine $near with Other Filters" example demonstrates this by combining `cuisine: "Italian"` with a `$near` query (which is an implicit `$and`).

**What was changed:** Removed `$and` and `$not` from the list of restricted operators, leaving the accurate restriction: "$near cannot be used inside `$or` or `$nor` expressions."

**Why:** The MongoDB documentation specifically restricts `$near` from `$or` and `$nor` expressions (because distance-based sorting is ambiguous across multiple OR branches). The `$and` restriction was incorrect and contradicted by the post's own examples.

## Review Notes
- The Node.js example calls `findNearbyRestaurants(-73.9857, 40.7580, 1000)` with a 1000m maxDistance. With the given coordinates, this would only return Sushi World. The code is technically correct — it will work as written — but a reader might expect more results. This is a minor pedagogical note, not an error.
- The `$geoNear` aggregation examples use `spherical: true`, which is required when using a `2dsphere` index. This is correct.
- All GeoJSON coordinates correctly use [longitude, latitude] ordering per the GeoJSON specification (RFC 7946).
- The `$near` vs `$nearSphere` comparison is accurate and helpful.
- All MongoDB shell syntax and Node.js driver code is syntactically correct and uses current APIs.
