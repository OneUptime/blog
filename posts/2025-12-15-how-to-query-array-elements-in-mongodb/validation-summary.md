# Validation Summary: How to Query Array Elements in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB query language
- MongoDB array query operators: `$all`, `$elemMatch`, `$size`, `$in`, `$nin`, `$not`
- MongoDB update positional operators: `$`, `$[]`, `$[<identifier>]`
- MongoDB aggregation pipeline: `$unwind`, `$group`, `$sort`, `$project`, `$filter`
- MongoDB multikey indexes and projection with `$slice`

## Sources Consulted
- MongoDB Docs: Query an Array - https://www.mongodb.com/docs/manual/tutorial/query-arrays/
- MongoDB Docs: Query an Array of Embedded Documents - https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
- MongoDB Docs: `$all` query operator - https://www.mongodb.com/docs/manual/reference/operator/query/all/
- MongoDB Docs: `$elemMatch` query operator - https://www.mongodb.com/docs/manual/reference/operator/query/elemmatch/
- MongoDB Docs: `$size` query operator - https://www.mongodb.com/docs/manual/reference/operator/query/size/
- MongoDB Docs: `$size` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/
- MongoDB Docs: `$not` query operator - https://www.mongodb.com/docs/manual/reference/operator/query/not/
- MongoDB Docs: `$[]` all positional update operator - https://www.mongodb.com/docs/manual/reference/operator/update/positional-all/
- MongoDB Docs: `$[<identifier>]` filtered positional update operator - https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/
- MongoDB Docs: Multikey indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
- MongoDB Docs: `$slice` projection operator - https://www.mongodb.com/docs/manual/reference/operator/projection/slice/
- MongoDB Docs: `$filter` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/

## Issues Found
- The example for "Find products where ALL ratings are 4 or above" used `ratings: { $not: { $lt: 4 } }`. MongoDB's documentation notes that `$not` can yield unexpected results when used with arrays. Changed it to combine `$type: "array"` with `$not: { $elemMatch: { $lt: 4 } }`, which explicitly matches array fields with no element below `4`.

## Review Notes
- The `$expr` examples using `$size` are correct for documents where `tags` is an array. In mixed-schema collections, `$size` as an aggregation expression can error on missing or non-array fields, so production queries may need `$isArray` or schema guarantees.
- The indexing examples are correct: indexes on array fields become multikey indexes automatically. `$size` query predicates themselves do not use indexes for that portion of a query.
