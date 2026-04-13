# Validation Summary: How to Query NULL and Missing Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query language, aggregation framework, indexing)
- BSON types
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: Query for Null or Missing Fields (https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/)
- MongoDB Manual: $exists operator (https://www.mongodb.com/docs/manual/reference/operator/query/exists/)
- MongoDB Manual: $type operator (https://www.mongodb.com/docs/manual/reference/operator/query/type/)
- MongoDB Manual: $type aggregation expression (https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/)
- MongoDB Manual: Sparse Indexes (https://www.mongodb.com/docs/manual/core/index-sparse/)
- MongoDB Manual: Partial Indexes (https://www.mongodb.com/docs/manual/core/index-partial/)

## Issues Found

1. **Sparse index description was incorrect.** The post stated "Sparse indexes only index documents where the field exists (non-null)." The "(non-null)" qualifier is wrong. Per MongoDB documentation, sparse indexes include entries for documents that have the indexed field even if the value is null. They only skip documents where the field is missing entirely. Fixed the description to accurately reflect this behavior.

2. **Partial index used unsupported `$ne` operator in `partialFilterExpression`.** The example `{ partialFilterExpression: { phone: { $exists: true, $ne: null } } }` would fail at runtime because `$ne` is not a supported operator in partial filter expressions. Supported operators are: equality (`$eq`), `$exists: true`, `$gt`/`$gte`/`$lt`/`$lte`, `$type`, and top-level `$and`. Replaced with `{ partialFilterExpression: { phone: { $type: 'string' } } }` which correctly indexes only documents where phone is a string value (excluding both null and missing).

3. **Aggregation pipeline did not properly distinguish null from missing.** In MongoDB's aggregation framework, `{ $eq: ["$phone", null] }` matches both null values and missing fields, so `phoneIsNull` would have counted 2 (both doc 2 and doc 3), which is misleading in a post specifically about distinguishing these states. Fixed by using `{ $type: "$phone" }` (which returns `"missing"` for absent fields) to properly separate the three states: has value, is null, and is missing. Also added a `phoneMissing` accumulator.

## Review Notes
- The partial index fix uses `$type: 'string'` which assumes phone values are always strings. If phone could be other types (e.g., number), the `partialFilterExpression` would need to be adjusted to include those types as well (e.g., using `$type` with an array of types, available in MongoDB 4.2+). This is reasonable for the tutorial context but worth noting.
- The `$ne: null` query operator (used in the "Querying for Non-Null Values" section) is correct for query operations -- it is only unsupported within `partialFilterExpression`.
