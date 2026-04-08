# Validation Summary: How to Create a Compound Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (compound indexes, query optimization, explain plans)
- MongoDB Shell (mongosh)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB Manual: Compound Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: ESR Rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/
- MongoDB Manual: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: Index Prefixes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/#prefixes
- MongoDB Manual: createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Node.js Driver Documentation — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
1. **Invalid `_id: 0` in index definition**: The covered query example used `db.products.createIndex({ category: 1, price: 1, _id: 0 })`. The value `0` is not a valid index key specification — index keys must be `1` (ascending), `-1` (descending), or a special index type (e.g., `"text"`, `"2dsphere"`). The `_id: 0` syntax is projection syntax, not index syntax. Since the query projection already excludes `_id` with `{ _id: 0 }`, the index only needs to contain the queried and projected fields. Fixed to `db.products.createIndex({ category: 1, price: 1 })`.

## Review Notes
- The ESR rule explanation is accurate and well-presented. MongoDB's official documentation classifies `$in` as a range operator in the context of ESR, which the post correctly follows.
- The `PROJECTION_COVERED` stage name referenced for covered queries is valid in modern MongoDB versions (4.x+).
- The Node.js driver example uses the current API correctly, including the `find(filter, options)` signature with `sort` in the options object.
- All other code examples, shell commands, and technical explanations are accurate.
