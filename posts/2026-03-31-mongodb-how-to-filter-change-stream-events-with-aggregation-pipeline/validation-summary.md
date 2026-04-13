# Validation Summary: How to Filter Change Stream Events with Aggregation Pipelines in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB Aggregation Pipeline (`$match`, `$project`, `$addFields`)
- Node.js MongoDB Driver (`.watch()` API)
- PyMongo (Python MongoDB Driver)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Aggregation Pipeline Stages allowed in Change Streams: https://www.mongodb.com/docs/manual/changeStreams/#modify-change-stream-output
- PyMongo `Collection.watch()` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.watch
- MongoDB `$$NOW` system variable: https://www.mongodb.com/docs/manual/reference/aggregation-variables/#mongodb-variable-variable.NOW

## Issues Found
1. **Performance Tips: Incorrect claim about index scans** — The post stated "Filter on indexed fields when possible - server can use index scans for the filter." This is incorrect. Change stream `$match` stages filter change event documents derived from the oplog; collection-level indexes are not used for this filtering. Changed to recommend filtering on `operationType` and top-level change event fields first, as these are the cheapest comparisons for the server.

## Review Notes
- The list of supported pipeline stages (`$match`, `$project`, `$addFields`, `$replaceRoot`, `$redact`) is incomplete — MongoDB also supports `$replaceWith`, `$set`, and `$unset` in change stream pipelines. However, since `$set` is an alias for `$addFields` and `$unset` is an alias for exclusion projection, the post functionally covers these concepts. Not changed since the post doesn't claim the list is exhaustive.
- The "Filtering by Document Fields" example filters on `operationType: 'insert'` but passes `fullDocument: 'updateLookup'` — this option has no effect for insert events (which always include `fullDocument`). It's harmless and the accompanying note correctly explains when the option is needed, so no change was made.
- Starting with MongoDB 6.0+, `fullDocument: 'whenAvailable'` and `fullDocumentBeforeChange: 'whenAvailable'` options are also available as alternatives to `'updateLookup'`. The post doesn't mention these newer options but is not incorrect for omitting them.
