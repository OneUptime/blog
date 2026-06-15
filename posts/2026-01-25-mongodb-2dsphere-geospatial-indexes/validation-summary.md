# Validation Summary: How to Build Location Apps with MongoDB 2dsphere Indexes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB geospatial queries
- MongoDB 2dsphere indexes
- GeoJSON Point, LineString, and Polygon data
- MongoDB Node.js driver
- Express.js
- JavaScript

## Sources Consulted
- MongoDB Manual: 2dsphere Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- MongoDB Manual: $near query operator: https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: $geoNear aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geonear/
- MongoDB Manual: Query for Locations Bound by a Polygon: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/query/geojson-bound-by-polygon/
- MongoDB Manual: Query for Locations that Intersect a GeoJSON Object: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/query/intersections-of-geojson-objects/
- MongoDB Node.js Driver Docs: Indexes: https://www.mongodb.com/docs/drivers/node/current/indexes/
- MongoDB Node.js Driver Docs: Geospatial Queries: https://www.mongodb.com/docs/drivers/node/current/crud/query/geo/

## Issues Found
- The `$geoNear` example said `spherical: true` is required for `2dsphere`. MongoDB documents `spherical` as optional; with `false`, `$geoNear` still uses spherical geometry for `2dsphere` indexes. Updated the comment to say it uses spherical geometry explicitly.
- The optimization example said the geospatial field should come first in compound indexes. MongoDB's 2dsphere compound index documentation does not require the 2dsphere key to be first. Updated the comment to say 2dsphere keys can be combined with regular fields in compound indexes.

## Review Notes
The examples are otherwise consistent with MongoDB's current GeoJSON coordinate order, 2dsphere index creation, `$near`, `$geoNear`, `$geoWithin`, and `$geoIntersects` behavior. Production APIs should add stricter request validation for parsed coordinates, radius values, and ObjectId input, but the examples are technically valid for the tutorial scope.
