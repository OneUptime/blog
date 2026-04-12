# Validation Summary: How to Create a Unique Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (unique indexes, compound indexes, sparse indexes, collation)
- MongoDB Shell (mongosh)
- Node.js with MongoDB Node.js Driver

## Sources Consulted
- MongoDB documentation on unique indexes: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB documentation on `createIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB documentation on sparse indexes: https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB documentation on collation and index: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
- **Logical error in "Testing the Unique Constraint" section**: The example attempted to `updateOne` a document with `{ name: "Another Alice" }`, but that document was never successfully inserted (the prior `insertOne` failed with E11000). The `updateOne` would therefore match 0 documents and be a silent no-op, not an E11000 error as the comment claimed. Fixed by inserting a second valid document (`Bob` with `bob@example.com`) and then attempting to update Bob's email to the duplicate value `alice@example.com`, which correctly triggers the E11000 duplicate key error.

## Review Notes
- The post recommends `sparse: true` for allowing multiple documents without the indexed field. While correct, MongoDB 3.2+ partial indexes (`partialFilterExpression`) are generally preferred for this use case as they offer more flexibility. The post briefly mentions partial indexes but doesn't show an example. This is not an error but could be a future improvement.
- The case-insensitive unique index section is correct but does not mention that queries using `find()` must also specify the same collation to leverage the index for lookups. The unique constraint enforcement itself always uses the index's collation, so this is not an error for the scope of this post.
