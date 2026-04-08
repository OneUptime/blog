# Validation Summary: How to Calculate Percentages and Ratios in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB $facet stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB $divide operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/
- MongoDB $multiply operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/multiply/
- MongoDB $cond operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB $round operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- MongoDB $map operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/
- MongoDB $arrayElemAt operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/
- MongoDB $count stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/

## Issues Found
No technical issues found.

## Review Notes
- The sample data block is marked as `json` but uses MongoDB shell constructors (`ObjectId()`, `ISODate()`), which is not valid JSON. This is a common convention in MongoDB tutorials and does not cause confusion.
- All aggregation operators used ($facet, $group, $count, $unwind, $project, $map, $divide, $multiply, $cond, $arrayElemAt, $round, $push, $sort, $match) are current and non-deprecated.
- The $round operator requires MongoDB 4.2+. The post does not mention a minimum version, but this is unlikely to be an issue for most readers.
- The ratio example correctly handles the edge case where $count returns an empty array (no matching documents): $arrayElemAt returns null, and the $cond guard prevents division errors since `null > 0` evaluates to false in MongoDB.
