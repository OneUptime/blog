# Validation Summary: How to Use MongoDB Geospatial Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB geospatial queries
- MongoDB GeoJSON data
- MongoDB 2dsphere and 2d indexes
- MongoDB query operators: $near, $nearSphere, $geoWithin, $geoIntersects
- MongoDB aggregation stage: $geoNear
- MongoDB Node.js driver
- MongoDB JSON Schema validation

## Sources Consulted
- MongoDB Manual: Geospatial Queries - https://www.mongodb.com/docs/manual/geospatial-queries/
- MongoDB Manual: Geospatial Indexes - https://www.mongodb.com/docs/v8.2/core/indexes/index-types/index-geospatial/
- MongoDB Manual: 2dsphere Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- MongoDB Manual: $near - https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: $geoNear - https://www.mongodb.com/docs/manual/reference/operator/aggregation/geonear/
- MongoDB Manual: $geoWithin - https://www.mongodb.com/docs/manual/reference/operator/query/geowithin/
- MongoDB Manual: $box - https://www.mongodb.com/docs/manual/reference/operator/query/box/
- MongoDB Manual: JSON Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/
- MongoDB Node.js Driver Documentation - https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
- The introduction said MongoDB geospatial queries can calculate delivery routes. MongoDB geospatial operators support location, proximity, containment, and intersection queries, but not road-network route calculation by themselves. Changed this to checking delivery zones.
- The `$geoNear` example used `distanceMultiplier: 0.001` but the inline comment still described the output distance as meters. Changed the comment to state that the field is kilometers after applying the multiplier.
- The `findInBoundingBox` helper used `$box` with the GeoJSON `location` field. MongoDB documents `$box` as a planar/grid-coordinate operator that does not query GeoJSON shapes and is only supported by the `2d` geospatial index. Replaced it with an equivalent GeoJSON Polygon inside `$geoWithin: { $geometry: ... }`.
- The `searchNearby` helper suggested creating a text index, but the code used case-insensitive regular expressions rather than `$text`. Removed the misleading text-index comment and kept the geospatial-index reminder.
- The performance note said `$geoWithin` can use the index more efficiently than `$near`. MongoDB's documented distinction is that `$geoWithin` returns unsorted results and can be faster when distance ordering is unnecessary. Updated the wording accordingly.

## Review Notes
The examples assume appropriate geospatial indexes exist on each queried field, such as `stores.location`, `deliveryZones.area`, `routes.path`, and `drivers.location`. The post demonstrates that for `stores`; future revisions could explicitly mention creating matching `2dsphere` indexes for every collection used in later examples.
