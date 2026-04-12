# Validation Summary: How to Monitor Document Size in MongoDB Collections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (shell commands, aggregation framework)
- `collStats` command
- `$bsonSize` aggregation operator (MongoDB 4.4+)
- `$bucket` aggregation stage
- `$sample` aggregation stage

## Sources Consulted
- MongoDB documentation on `collStats` command: https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB documentation on `$bsonSize` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/
- MongoDB documentation on `$bucket` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB documentation on `$sample` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/
- MongoDB documentation on BSON document size limit: https://www.mongodb.com/docs/manual/reference/limits/#mongodb-limit-BSON-Document-Size

## Issues Found
1. **Compression calculation bug in Method 1** — The expression `(1 - stats.storageSize / stats.size).toFixed(2) * 100` calls `.toFixed(2)` (which returns a string) before multiplying by 100. JavaScript's implicit type coercion makes this work numerically, but it produces a less precise result than intended (e.g., "35%" instead of "34.6%"). Fixed to `((1 - stats.storageSize / stats.size) * 100).toFixed(1)` so the multiplication happens on the number before string formatting.

## Review Notes
- The `collStats` command and `db.collection.stats()` shell helper are deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation pipeline stage. The commands still work but may be removed in a future release. The post does not specify a MongoDB version, so this is not an error, but worth noting for future updates.
- The `$bsonSize` operator is correctly noted as available from MongoDB 4.4. All pipeline examples use valid syntax and would work as described.
- Method 6 uses `$bsonSize` on field references like `"$lineItems"` and `"$metadata"`. This works correctly for subdocuments and arrays (BSON arrays are encoded as documents), but will return null if the field is missing or null on a given document. This is acceptable behavior for a monitoring/diagnostic query.
