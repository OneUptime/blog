# Validation Summary: How to Design Schemas for Read-Heavy Workloads in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (schema design, indexing, aggregation framework)
- MongoDB Node.js Driver (readPreference, find, aggregate)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: $count (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/
- MongoDB Manual: Read Preference — https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Manual: explain() results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Node.js Driver: readPreference — https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/#read-preference

## Issues Found
1. **Unquoted dot-notation key in `createIndex`** (line 40): The index field `category._id` was not quoted in the `createIndex` object literal. In JavaScript, a dot-notation path like `category._id` must be written as the string `"category._id"` — without quotes it is a syntax error since dots are not valid in unquoted property names. Changed `{ category._id: 1, ... }` to `{ "category._id": 1, ... }`. The corresponding `find` query already had the field correctly quoted.

## Review Notes
- The `ObjectId("cat1")` and `ObjectId("seller1")` in the denormalization example are not valid ObjectId hex strings (ObjectId requires a 24-character hex string). However, they are used as illustrative placeholders in a document shape example, not as executable code, which is a common convention in MongoDB tutorials.
- The `$count: {}` accumulator syntax used in the aggregation pipeline is valid in MongoDB 5.0+. Readers on older versions would need to use `{ $sum: 1 }` instead.
- The post correctly advises keyset (cursor-based) pagination over skip-based pagination for large datasets, which aligns with MongoDB best practices.
- The covered query verification guidance (check for `IXSCAN` with `totalDocsExamined: 0`) is accurate.
