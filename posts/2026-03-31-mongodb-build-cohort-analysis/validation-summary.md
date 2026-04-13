# Validation Summary: How to Build a Cohort Analysis in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework (`$lookup`, `$unwind`, `$project`, `$group`, `$sort`)
- MongoDB date operators (`$dateToString`, `$subtract`)
- MongoDB math operators (`$floor`, `$divide`, `$size`)
- MongoDB set accumulator (`$addToSet`)
- MongoDB indexing (`createIndex`)

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$lookup` reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB `$dateToString` reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB `$subtract` on dates (returns milliseconds): https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- MongoDB `$addToSet` accumulator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/addToSet/
- MongoDB `$floor` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/floor/
- MongoDB `createIndex` reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
No technical issues found.

## Review Notes
- The data model code blocks are labeled as `json` but contain MongoDB shell constructors (`ISODate()`, `ObjectId()`) which are not valid JSON. This is an extremely common convention in MongoDB tutorials and not a technical error, but could be labeled `javascript` for strict correctness.
- The `monthsElapsed` calculation uses a 30-day month approximation (`1000 * 60 * 60 * 24 * 30`). This is standard for cohort analysis but will produce slight inaccuracies for months with 28, 29, or 31 days. For most retention analysis use cases this is acceptable.
- The `$lookup` joins on `users._id` which is automatically indexed by MongoDB, so the join is efficient without any additional index. The recommended `signupDate` index is useful for date-range filtering but is not required by the pipeline as written.
