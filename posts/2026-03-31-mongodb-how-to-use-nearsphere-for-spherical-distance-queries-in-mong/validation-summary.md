# Validation Summary: How to Use $nearSphere for Spherical Distance Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB geospatial queries (`$nearSphere`, `$near`, `$geoNear`)
- MongoDB `2dsphere` and `2d` indexes
- GeoJSON Point format
- Node.js with MongoDB Node.js driver
- Python with PyMongo

## Sources Consulted
- MongoDB official documentation: $nearSphere query operator (https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/)
- MongoDB official documentation: $near query operator (https://www.mongodb.com/docs/manual/reference/operator/query/near/)
- MongoDB official documentation: $geoNear aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/)
- MongoDB official documentation: 2dsphere indexes (https://www.mongodb.com/docs/manual/core/2dsphere/)
- MongoDB official documentation: 2d indexes (https://www.mongodb.com/docs/manual/core/2d/)
- PyMongo documentation: GEOSPHERE constant (https://pymongo.readthedocs.io/)

## Issues Found
1. **Incorrect "legacy operator" characterization**: The post stated "$nearSphere is a legacy operator," but MongoDB does not designate `$nearSphere` as legacy or deprecated. It is a fully supported operator. The key distinction is that `$nearSphere` is the only way to get spherical distance calculations with a `2d` index, while for `2dsphere` indexes, `$near` with `$geometry` is functionally equivalent. Updated the description to accurately reflect that `$nearSphere` is not deprecated, while still recommending `$near` with `$geometry` for new applications using `2dsphere` indexes.

2. **Comparison table labeled $nearSphere as "Legacy use"**: The recommendation column in the comparison table said "Legacy use" for `$nearSphere`, reinforcing the incorrect legacy characterization. Changed to "When using `2d` indexes" to accurately describe when `$nearSphere` is the appropriate choice.

## Review Notes
- The `$sort: { distanceMeters: 1 }` stage in the `$geoNear` aggregation example is redundant, since `$geoNear` already outputs documents sorted by distance. It is not technically wrong (sorting an already-sorted result is a no-op), but it could be removed for clarity. Left as-is since it does not cause incorrect behavior and may serve as a pedagogical reminder of the sort order.
- All GeoJSON coordinates use the correct [longitude, latitude] order.
- The radians conversion math (1/6371 ≈ 0.000157) is accurate.
- All code examples (MongoDB shell, Node.js, Python) are syntactically correct and use current APIs.
- The NYC landmark coordinates are reasonable approximations.
