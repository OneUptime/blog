# Validation Summary: How to Query by Array Size in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB query operators
- MongoDB aggregation expressions and pipeline stages
- MongoDB indexes
- JavaScript / Node.js MongoDB driver usage

## Sources Consulted
- MongoDB Manual: `$size` query operator, https://www.mongodb.com/docs/v7.0/reference/operator/query/size/
- MongoDB Manual: `$size` aggregation expression, https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/
- MongoDB Manual: `$expr` query operator, https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB Manual: Query Arrays and dot notation, https://www.mongodb.com/docs/manual/tutorial/query-arrays/
- MongoDB Manual: `$exists` query operator and indexing behavior, https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- MongoDB Manual: `$ne` query operator and array comparison behavior, https://www.mongodb.com/docs/manual/reference/operator/query/ne/
- MongoDB Manual: Indexes, https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: `db.collection.update()` and dot notation updates, https://www.mongodb.com/docs/manual/reference/method/db.collection.update/

## Issues Found
- The original post stated that `$size: n` supports indexes and labeled exact `$size` queries as "Indexed - Fast." MongoDB documentation states that queries cannot use indexes for the `$size` portion of a query. The post now says `$size` is an exact-match-only method and marks `$size: n` as not index-supported in the performance table.
- The original dot-notation section and examples implied all `$exists` array-position checks are index-friendly. The post now narrows this to positive `$exists: true` checks, because MongoDB's `$exists` documentation distinguishes positive existence checks from `$exists: false`, which cannot use an index to avoid scanning matching missing-field documents.
- `$expr` and aggregation examples using the aggregation `$size` expression did not mention that `$size` errors when its argument is missing or not an array. The post now notes that these examples assume the field exists and contains an array, and recommends guarding with `$isArray` when schemas are flexible.
- The non-empty array example used `{ $exists: true, $ne: [] }`, which can also match non-array values. It now uses `{ $type: "array", $ne: [] }` to match non-empty arrays more accurately.
- The denormalized count examples decremented the count whenever `$pull` was issued, even if the value was not present. The update filter and helper now require the array to contain the pulled value before decrementing, which keeps the stored count from drifting for unique-value arrays.

## Review Notes
The stored count-field approach is technically valid and aligns with MongoDB's recommendation to maintain a counter field for queries over varying array lengths. Applications that allow duplicate array values or `$pull` conditions that remove multiple elements need more careful count maintenance than the simple helper shown here.
