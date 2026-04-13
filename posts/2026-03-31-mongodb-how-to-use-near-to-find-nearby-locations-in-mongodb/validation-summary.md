# Validation Summary: How to Use $near to Find Nearby Locations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (geospatial queries)
- `$near` and `$nearSphere` query operators
- `$geoNear` aggregation stage
- `2dsphere` index
- GeoJSON Point format
- Node.js with MongoDB Node.js Driver
- Python with PyMongo

## Sources Consulted
- MongoDB $near operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB $nearSphere operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/
- MongoDB $geoNear aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB 2dsphere index documentation: https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB GeoJSON objects documentation: https://www.mongodb.com/docs/manual/reference/geojson/
- PyMongo documentation for GEOSPHERE constant and create_index

## Issues Found
1. **`$nearSphere` incorrectly described as "Legacy operator"**: The post stated `$nearSphere` is a "Legacy operator" and labeled its usage as "Legacy approach (avoid unless using 2d index)." This is inaccurate — `$nearSphere` is a current, fully supported MongoDB operator and is not deprecated. When used with GeoJSON and a `2dsphere` index, it behaves identically to `$near` with `$geometry`. The distinction matters only with legacy coordinate pairs. **Fix:** Changed the description to accurately state that `$nearSphere` always uses spherical calculation and is equivalent to `$near` with `$geometry` when both use GeoJSON + `2dsphere`. Changed the code comment from "Legacy approach" to "Alternative with legacy coordinates."

## Review Notes
- All MongoDB shell code examples use correct syntax and would work as shown.
- GeoJSON coordinate order is correctly documented as `[longitude, latitude]` throughout.
- Distance units are correctly stated as meters for GeoJSON/`$geometry` mode and radians for legacy coordinate pairs.
- The `$geoNear` aggregation example correctly includes `distanceField` (required) and `spherical: true` (needed for `2dsphere` index).
- The Node.js and Python examples are both syntactically correct and follow best practices for their respective drivers.
- The sample output distances are plausible for the given London coordinates.
