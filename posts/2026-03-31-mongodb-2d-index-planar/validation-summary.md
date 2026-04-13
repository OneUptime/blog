# Validation Summary: How to Create a 2d Index in MongoDB for Planar Coordinates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (2d geospatial index)
- MongoDB Node.js Driver
- MongoDB Shell (mongosh)
- MongoDB Aggregation Framework (`$geoNear`)

## Sources Consulted
- MongoDB 2d Indexes Documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2d/
- MongoDB Create a 2d Index Tutorial: https://www.mongodb.com/docs/manual/tutorial/build-a-2d-index/
- MongoDB $near Query Operator: https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB $nearSphere Query Operator: https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/
- MongoDB $geoWithin Operator: https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB $geoNear Aggregation Stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Geospatial Queries Overview: https://www.mongodb.com/docs/manual/geospatial-queries/

## Issues Found

1. **Comparison table: GeoJSON support for 2d index listed as "Partial" — should be "No".**
   The 2d index does not support GeoJSON objects at all. GeoJSON requires a `2dsphere` index. Changed "Partial" to "No" in the comparison table.

2. **Comparison table: `$nearSphere` omitted from 2d index operators.**
   The `$nearSphere` operator is supported by 2d indexes with legacy coordinate pairs (it calculates spherical distance). Added `$nearSphere` to the 2d index operator list in the comparison table.

3. **Comparison table: 2dsphere coordinate format listed as only "GeoJSON objects".**
   The `2dsphere` index supports both GeoJSON objects and legacy coordinate pairs. Changed to "GeoJSON and legacy pairs" for accuracy.

## Review Notes
- The index creation syntax, default option values (min: -180, max: 180, bits: 26), coordinate storage formats, and all query examples are correct.
- The `$geoNear` aggregation example correctly uses `spherical: false` for 2d indexes.
- The Node.js driver game map example is syntactically correct and uses current APIs.
- The best practices section is accurate and gives sound advice.
