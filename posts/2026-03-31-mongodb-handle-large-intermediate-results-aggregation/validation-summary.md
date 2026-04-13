# Validation Summary: How to Handle Large Intermediate Results in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB aggregation framework
- MongoDB `$group`, `$sort`, `$match`, `$project`, `$unwind`, `$reduce`, `$bucket`, `$merge` pipeline stages
- `allowDiskUse` option
- Node.js MongoDB driver (cursor-based processing, `for await...of`)

## Sources Consulted
- MongoDB documentation on aggregation pipeline limits (https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/)
- MongoDB documentation on `$project` stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/)
- MongoDB documentation on `$merge` stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/)
- MongoDB documentation on `$bucket` stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/)
- MongoDB documentation on `$reduce` operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/)
- MongoDB documentation on `allowDiskUse` (https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/)

## Issues Found
1. **`$project` mixed inclusion and exclusion (lines 57-64)**: The `$project` stage specified both inclusion fields (`customerId: 1, amount: 1`) and exclusion fields (`description: 0, notes: 0, metadata: 0`). MongoDB does not allow mixing inclusion and exclusion projections in `$project` (with the sole exception of the `_id` field). This would throw an error at runtime. Fixed by using inclusion-only projection (`customerId: 1, amount: 1`), which automatically excludes all other fields.

## Review Notes
- **MongoDB 6.0+ `allowDiskUse` default change**: Starting with MongoDB 6.0, the server parameter `allowDiskUseByDefault` defaults to `true`, meaning aggregation stages that exceed 100MB can automatically spill to disk without explicitly setting `allowDiskUse: true`. The post's statement that "MongoDB throws an error unless you explicitly enable disk usage" is accurate for versions before 6.0 but outdated for 6.0+. The post does not specify a version, so this is a minor caveat rather than an error.
- **`$merge` with `.toArray()`**: In the `$merge` example (Step 1), calling `.toArray()` after an aggregation ending with `$merge` is unnecessary since `$merge` is a terminal stage that writes to the output collection and does not return documents to the client. The call works but returns an empty array. Not changed since it is not technically incorrect, just unnecessary.
- **`$unwind` alternative changes semantics**: The "BETTER" alternative to the `$unwind` example groups by `_id: null` (total revenue) whereas the "BAD" example groups by `$lineItems.productId` (per-product revenue). These are not semantically equivalent operations. The general principle of avoiding `$unwind` is sound, but the comparison is not apples-to-apples. Not changed since the post acknowledges this limitation in a comment.
