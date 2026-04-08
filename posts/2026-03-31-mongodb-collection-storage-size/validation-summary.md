# Validation Summary: How to Use db.collection.storageSize() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell methods, WiredTiger storage engine)
- JavaScript (mongosh scripting)

## Sources Consulted
- MongoDB official documentation: `db.collection.storageSize()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.storageSize/
- MongoDB official documentation: `db.collection.stats()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB official documentation: `db.collection.totalSize()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.totalSize/
- MongoDB official documentation: `db.collection.totalIndexSize()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.totalIndexSize/
- MongoDB official documentation: `db.collection.dataSize()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.dataSize/

## Issues Found
- **Summary section referenced non-existent `size()` method**: The summary stated "Use it alongside `size()` and `totalIndexSize()`". There is no `db.collection.size()` method in MongoDB. The correct method for retrieving the uncompressed logical data size of a collection is `db.collection.dataSize()`. Changed `size()` to `dataSize()`.

## Review Notes
- `db.collection.stats()` was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The post does not specify a MongoDB version, and `stats()` still works in current versions, so this is not an error but worth noting for future updates.
- All code examples use valid `mongosh` syntax (template literals, arrow functions, `const`/`let`) and will work in modern MongoDB Shell.
- The compression ratio claim of 2x-5x for WiredTiger is a reasonable general estimate, though actual ratios vary by data characteristics.
