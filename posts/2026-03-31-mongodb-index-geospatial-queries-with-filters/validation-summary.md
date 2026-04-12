# Validation Summary: How to Index for Geospatial Queries with Filters in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (geospatial features)
- 2dsphere indexes
- GeoJSON (Point, Polygon)
- MongoDB query operators: `$near`, `$geoWithin`, `$geoNear`
- MongoDB aggregation pipeline

## Sources Consulted
- MongoDB Manual — 2dsphere Indexes: https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB Manual — Geospatial Queries: https://www.mongodb.com/docs/manual/geospatial-queries/
- MongoDB Manual — $near operator: https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual — $geoWithin operator: https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB Manual — $geoNear aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Manual — Compound Indexes: https://www.mongodb.com/docs/manual/core/index-compound/
- GeoJSON RFC 7946: https://datatracker.ietf.org/doc/html/rfc7946

## Issues Found
No technical issues found.

## Review Notes
- The `$sort` stage after `$geoNear` in the aggregation example is redundant since `$geoNear` already returns results sorted by distance. It is not incorrect, but could be noted as unnecessary in a future revision.
- The "Query Within a Radius" example filters on both `category` and `isOpen`, but the compound indexes defined earlier cover only one equality field each. A compound index like `{ category: 1, isOpen: 1, location: "2dsphere" }` would better serve that specific query. This is a minor optimization gap, not a correctness issue.
