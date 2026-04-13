# Validation Summary: How to Create a 2dsphere Geospatial Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (2dsphere geospatial indexes)
- GeoJSON (Point, Polygon geometry types)
- MongoDB query operators: `$near`, `$nearSphere`, `$geoWithin`, `$geoIntersects`
- MongoDB aggregation: `$geoNear` stage

## Sources Consulted
- MongoDB Manual — 2dsphere Indexes: https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB Manual — `$near`: https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual — `$nearSphere`: https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/
- MongoDB Manual — `$geoWithin`: https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB Manual — `$geoIntersects`: https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/
- MongoDB Manual — `$geoNear` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- GeoJSON Specification (RFC 7946): https://datatracker.ietf.org/doc/html/rfc7946

## Issues Found
1. **Line 118 — Incorrect unit in `$nearSphere` comment**: The comment stated "Using $nearSphere for spherical calculations (radians)". When `$nearSphere` is used with GeoJSON `$geometry` (as in this example), `$maxDistance` is specified in **meters**, not radians. Radians are only used with legacy coordinate pairs. Changed the comment to "Using $nearSphere for spherical distance search (meters with GeoJSON)".

## Review Notes
- In MongoDB 5.0+, the `spherical` option in `$geoNear` defaults to `true` when using a 2dsphere index, making it optional. The post explicitly sets `spherical: true`, which is still valid and arguably clearer for a tutorial.
- All GeoJSON polygons correctly close by repeating the first coordinate and follow proper winding order.
- NYC coordinate values used in examples are plausible for the named locations.
