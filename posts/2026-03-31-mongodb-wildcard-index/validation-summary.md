# Validation Summary: How to Create a Wildcard Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.2+)
- MongoDB Wildcard Indexes
- MongoDB Node.js Driver
- JavaScript / Node.js

## Sources Consulted
- MongoDB official documentation on Wildcard Indexes: https://www.mongodb.com/docs/manual/core/index-wildcard/
- MongoDB official documentation on createIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on Wildcard Index Restrictions: https://www.mongodb.com/docs/manual/core/index-wildcard/#wildcard-index-restrictions
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
- **Incorrect limitation about arrays of sub-documents**: The post stated "They cannot index arrays that contain sub-documents (only scalar values and arrays of scalars are indexed)." This is incorrect. According to MongoDB's official documentation, wildcard indexes DO traverse into arrays of sub-documents and create index entries for the scalar leaf fields within those sub-documents. The actual array-related limitation is that wildcard indexes do not support queries that test exact array equality or use explicit array indices in the field path. Changed the bullet point to accurately reflect this limitation.

## Review Notes
- All `createIndex` syntax examples (`$**`, `field.$**`, `wildcardProjection`) are correct and current.
- The `wildcardProjection` option with include/exclude semantics is accurately described.
- The Node.js example uses correct modern MongoDB Node.js driver syntax.
- The `explain()` usage and expected output (IXSCAN stage) are correct.
- The claim that wildcard indexes were introduced in MongoDB 4.2 is correct.
- The remaining limitations (no shard key support, no covered queries, no `$expr` support, not a replacement for compound indexes) are all accurate.
- Best practices section is sound and aligns with MongoDB's official recommendations.
