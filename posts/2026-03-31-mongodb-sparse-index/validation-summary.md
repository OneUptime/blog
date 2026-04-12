# Validation Summary: How to Create a Sparse Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sparse indexes, partial indexes, query planner behavior)
- MongoDB Node.js Driver
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual — Sparse Indexes: https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual — Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual — db.collection.createIndex(): https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Node.js Driver API — createIndex: https://mongodb.github.io/node-mongodb-native/

## Issues Found
1. **Incorrect option name `filterExpression` in Partial Index comparison (line 161):** The post stated that a sparse index is equivalent to a partial index with `{ filterExpression: { ... } }`. The correct MongoDB option name is `partialFilterExpression`, not `filterExpression`. Fixed the inline reference to use the correct option name. The code example further down in the same section already used `partialFilterExpression` correctly, so only the prose bullet point was wrong.

## Review Notes
- The explanation that sparse indexes include entries for documents where the field value is `null` (as long as the field exists) is correct and an important nuance.
- The warning about sparse indexes affecting `sort()` and `count()` results is accurate and valuable.
- The recommendation to prefer partial indexes over sparse indexes for new work aligns with current MongoDB best practices.
- The Node.js example is syntactically correct and uses current MongoDB driver APIs (`MongoClient`, `createIndex`, `insertMany`, `countDocuments`).
- The `hint({ _id: 1 })` workaround for sort behavior is correct.
