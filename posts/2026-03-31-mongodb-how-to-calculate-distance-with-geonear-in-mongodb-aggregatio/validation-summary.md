# Validation Summary: How to Calculate Distance with $geoNear in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework)
- `$geoNear` aggregation stage
- GeoJSON / 2dsphere indexes
- Node.js MongoDB driver

## Sources Consulted
- MongoDB official documentation: `$geoNear` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/)
- MongoDB official documentation: Geospatial Indexes (https://www.mongodb.com/docs/manual/geospatial-queries/)
- MongoDB official documentation: GeoJSON Objects (https://www.mongodb.com/docs/manual/reference/geojson/)
- MongoDB Node.js Driver documentation (https://www.mongodb.com/docs/drivers/node/current/)
- MongoDB 5.1 Release Notes — removal of `num` option from `$geoNear`

## Issues Found

1. **Removed `num` option in `$geoNear` (Step 3):** The `num` parameter was removed from the `$geoNear` aggregation stage in MongoDB 5.1. The post used `num: 5` inside the `$geoNear` stage to limit results. Fixed by removing `num` from `$geoNear` and adding a `{ $limit: 5 }` stage after it, which is the current recommended approach.

2. **Mismatched comment in Step 6:** The inline comment said "Find nearest 10 venues" but the pipeline used `$limit: 20`. Updated the comment to say "Find nearest 20 venues" to match the actual code.

## Review Notes
- The `spherical: true` option is explicitly set throughout the post. Starting in MongoDB 5.0, this defaults to `true` for 2dsphere indexes with GeoJSON points, so it is technically redundant but not incorrect. Keeping it explicit is fine for clarity and backward compatibility.
- The sample output distances in Step 2 are illustrative approximations, not exact computed values. This is acceptable for a tutorial.
- The walking time math (5 km/h average speed) is correctly computed using `$divide` operations.
- The `distanceMultiplier` values are correct: 0.001 for meters-to-kilometers and 0.000621371 for meters-to-miles.
- All GeoJSON coordinates use the correct `[longitude, latitude]` order as required by MongoDB.
