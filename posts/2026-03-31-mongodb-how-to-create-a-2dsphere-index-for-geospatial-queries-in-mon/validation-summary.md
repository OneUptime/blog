# Validation Summary: How to Create a 2dsphere Index for Geospatial Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (2dsphere geospatial indexes)
- GeoJSON (Point, Polygon, LineString geometry types)
- MongoDB Query Operators ($near, $geoWithin, $centerSphere, $geoNear)
- MongoDB Aggregation Framework

## Sources Consulted
- MongoDB Manual: 2dsphere Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- MongoDB Manual: Geospatial Queries — https://www.mongodb.com/docs/manual/geospatial-queries/
- MongoDB Manual: $near operator — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: $geoWithin operator — https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB Manual: $geoNear aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Manual: $centerSphere — https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/
- GeoJSON Specification (RFC 7946) — https://datatracker.ietf.org/doc/html/rfc7946

## Issues Found
1. **Step 8 — Incorrect claim about compound index limitation**: The post stated "A compound index can have only ONE 2dsphere field" and showed a two-2dsphere-field index as invalid. This is incorrect. MongoDB has supported compound indexes with multiple `2dsphere` fields since version 2.6. The example `db.places.createIndex({ location: "2dsphere", area: "2dsphere" })` is valid. Fixed the comments to reflect that multiple 2dsphere fields are allowed, and also clarified the sparse index default behavior wording (not sparse by default in MongoDB 4.4+).

## Review Notes
- The `spherical: true` option in the `$geoNear` aggregation stage is technically redundant when using a 2dsphere index in MongoDB 5.0+, as the spherical calculation is inferred from the index type. However, including it is not an error and maintains backward compatibility with older versions, so it was left as-is.
- All GeoJSON coordinates used in examples are valid (NYC area) and within proper ranges.
- The Earth radius value of 6371 km used for the $centerSphere radians conversion is the standard mean radius and is correct.
