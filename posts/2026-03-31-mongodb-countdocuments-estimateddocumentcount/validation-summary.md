# Validation Summary: How to Count Documents with countDocuments() in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side query engine, aggregation framework)
- MongoDB Node.js Driver (`countDocuments`, `estimatedDocumentCount`, `aggregate`)

## Sources Consulted
- MongoDB official documentation: `countDocuments()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
- MongoDB official documentation: `estimatedDocumentCount()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.estimatedDocumentCount/
- MongoDB official documentation: `$count` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/
- MongoDB official documentation: `$group` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB Node.js Driver API documentation — https://mongodb.github.io/node-mongodb-native/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that `count()` is deprecated in favor of `countDocuments()` and `estimatedDocumentCount()` (deprecated since MongoDB 4.0).
- `countDocuments()` internally executes an aggregation pipeline (`$match` + `$group`), which the post alludes to by mentioning it "uses the query planner." This is accurate.
- The advice to use `estimatedDocumentCount()` instead of `countDocuments({})` for total counts on large collections is sound — `countDocuments({})` scans via aggregation while `estimatedDocumentCount()` reads the cached metadata count.
- All Node.js driver code examples use correct async/await syntax and valid API signatures.
