# Validation Summary: How to Filter Change Stream Events by Operation Type in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB Aggregation Pipeline (`$match`, `$project`, `$addFields`)
- Node.js MongoDB Driver (`collection.watch()`, event-driven and async iterator patterns)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Aggregation Pipeline Stages allowed in Change Streams: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/#change-stream-stages
- MongoDB `$$NOW` system variable: https://www.mongodb.com/docs/manual/reference/aggregation-variables/#mongodb-variable-variable.NOW
- Node.js MongoDB Driver `watch()` API: https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#watch

## Issues Found
No technical issues found.

## Review Notes
- The list of allowed pipeline stages is correct but not exhaustive. MongoDB 4.2+ also allows `$replaceWith`, `$set`, and `$unset` (which are aliases for `$replaceRoot`, `$addFields`, and `$project` field removal respectively). MongoDB 6.0+ adds `$changeStreamSplitLargeEvent`. The post does not claim the list is exhaustive, and the stages listed cover the most common use cases.
- The operation types table covers the core types. MongoDB 4.0+ also supports `createIndexes` and `dropIndexes`, and MongoDB 6.0+ added additional types like `create`, `modify`, `reshardCollection`, and `refineCollectionShardKey`. These are less commonly filtered on and their omission does not affect correctness.
- The `fullDocument: "updateLookup"` option is correctly documented and used. In MongoDB 6.0+, `fullDocument: "whenAvailable"` and `fullDocumentBeforeChange: "whenAvailable"` are also available as alternatives, but the post uses the widely supported option.
