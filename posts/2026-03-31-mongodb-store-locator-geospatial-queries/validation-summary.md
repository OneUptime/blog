# Validation Summary: How to Build a Store Locator with MongoDB Geospatial Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (geospatial queries, `$geoNear` aggregation stage, `2dsphere` index)
- GeoJSON (Point geometry)
- Node.js
- Express.js

## Sources Consulted
- MongoDB $geoNear aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB 2dsphere index documentation: https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB GeoJSON objects documentation: https://www.mongodb.com/docs/manual/reference/geojson/
- MongoDB $round aggregation operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/

## Issues Found
- **Inaccurate comment on line 124**: The comment said "Find stores with parking and pickup within 20 km" but the code only queries for the `"pickup"` feature (a single string passed to `findStoresByFeature`). Fixed to "Find stores with pickup within 20 km".

## Review Notes
- The `spherical: true` option in `$geoNear` is required for MongoDB versions prior to 5.0 when using a `2dsphere` index. Starting with MongoDB 5.0, it defaults to `true` for `2dsphere` indexes, making it redundant but harmless. The post's usage is correct for broad version compatibility.
- The Express API example omits `try/catch` error handling around the async database call and does not show the MongoDB connection setup. This is acceptable for a focused tutorial but readers building a production API should add proper error handling.
- The sample output distances are approximate and illustrative. Minor variations from exact Haversine calculations are expected and acceptable for demonstrating output format.
