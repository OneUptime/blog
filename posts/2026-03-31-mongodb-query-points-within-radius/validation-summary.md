# Validation Summary: How to Query Points Within a Radius in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (geospatial queries)
- GeoJSON (Point type)
- MongoDB `$near` operator with `$maxDistance` / `$minDistance`
- MongoDB `$geoWithin` with `$centerSphere`
- MongoDB `$geoNear` aggregation stage
- `2dsphere` index

## Sources Consulted
- MongoDB Manual: `$near` operator — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: `$geoWithin` operator — https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB Manual: `$centerSphere` — https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/
- MongoDB Manual: `$geoNear` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Manual: `2dsphere` indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB Manual: GeoJSON objects — https://www.mongodb.com/docs/manual/reference/geojson/
- Haversine formula verification of coordinate distances

## Issues Found
- **Incorrect sample output in Method 3 ($geoNear)**: The sample output showed wrong distances and wrong ordering for the given coordinates. The blog listed Coffee Shop at 340m, Bookstore at 680m, and Park at 1120m. Haversine calculation against the actual coordinates shows the correct order is: Park (~686m), Bookstore (~811m), Coffee Shop (~1067m), Restaurant (~1395m). The ordering was reversed and the distances were fabricated rather than computed from the sample data. Additionally, Restaurant was missing from the output despite being within the 2000m `maxDistance`. Fixed the sample output to reflect accurate distances and include all 4 documents.

## Review Notes
- The `$sort: { distanceMeters: 1 }` stage after `$geoNear` in Method 3 is redundant since `$geoNear` already returns results sorted by distance (nearest first). It is not incorrect but adds unnecessary overhead. Left as-is since it does not affect correctness and may serve as a pedagogical clarification.
- The `spherical: true` option in `$geoNear` is explicitly set in all examples. Starting with MongoDB 4.2+, this is inferred from the 2dsphere index and is optional, but including it is not an error.
- All MongoDB operator syntax (`$near`, `$geometry`, `$maxDistance`, `$minDistance`, `$geoWithin`, `$centerSphere`, `$geoNear`) is correct and current.
- GeoJSON coordinate format `[longitude, latitude]` is used correctly throughout.
- Earth radius of 6378.1 km used for radian conversion matches the MongoDB documentation recommendation.
- Unit conversion constants (1609.34 m/mile, 3.28084 ft/m) are correct.
