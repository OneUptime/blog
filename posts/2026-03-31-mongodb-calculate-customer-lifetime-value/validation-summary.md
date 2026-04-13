# Validation Summary: How to Calculate Customer Lifetime Value in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation pipeline
- MongoDB `$group`, `$project`, `$bucket`, `$sort`, `$limit` stages
- MongoDB date arithmetic (`$subtract` on dates)
- MongoDB compound indexes

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$group` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$project` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB `$bucket` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB `$subtract` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- MongoDB `$max` operator (expression): https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/
- MongoDB `$divide` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/
- MongoDB `createIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
No technical issues found.

## Review Notes
- The sample data block is labeled as `json` but contains MongoDB shell constructors (`ObjectId()`, `ISODate()`) which are not valid JSON. This is a very common convention in MongoDB tutorials and documentation, so it was left as-is.
- The month approximation uses 30-day months (`1000 * 60 * 60 * 24 * 30` milliseconds). This is a reasonable simplification for analytics purposes and is correctly described as an approximation.
- `new Date()` in the projected CLV pipeline is evaluated client-side in mongosh at query build time, not server-side. This is standard practice and works correctly for this use case.
- The `$max: ["$monthsSinceFirst", 1]` guard against division by zero is a good defensive pattern for customers with very recent first orders.
