# Validation Summary: How to List All Indexes on a Collection in MongoDB

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MongoDB (shell methods, aggregation framework, database commands)
- mongosh (MongoDB Shell)
- JavaScript (shell scripting examples)

## Sources Consulted
- MongoDB official documentation: `db.collection.getIndexes()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/
- MongoDB official documentation: `listIndexes` command — https://www.mongodb.com/docs/manual/reference/command/listIndexes/
- MongoDB official documentation: `$indexStats` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB official documentation: `db.collection.stats()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB official documentation: `db.collection.totalIndexSize()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.totalIndexSize/
- MongoDB official documentation: Index Properties — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/#output

## Issues Found
No technical issues found.

## Review Notes
- `db.collection.stats()` and `db.collection.totalIndexSize()` were deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The post does not target a specific MongoDB version and these methods still function, so no change was made. Future readers on MongoDB 6.2+ may want to use `db.collection.aggregate([{ $collStats: { storageStats: {} } }])` instead.
- The `$indexStats` example output omits the `host` field from the second index entry for brevity. This is a minor inconsistency in the example output but does not affect correctness since the examples are illustrative.
- The `fieldHasIndex()` helper checks if a field appears anywhere in a compound index key, not just as a prefix. This is correct for what the function claims to do, but users should be aware that a non-prefix field in a compound index may not help with all query patterns.
