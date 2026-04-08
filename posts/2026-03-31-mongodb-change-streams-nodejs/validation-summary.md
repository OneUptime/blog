# Validation Summary: How to Use Change Streams with MongoDB Node.js Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Change Streams
- MongoDB Node.js Driver (`mongodb` npm package)
- Node.js (async iterators, event emitters, fs module)
- Redis (referenced in cache invalidation example)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver API — ChangeStream: https://mongodb.github.io/node-mongodb-native/6.0/classes/ChangeStream.html
- MongoDB Node.js Driver API — Collection.watch(): https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#watch
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Server Error Codes (ChangeStreamHistoryLost = 286): https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found
1. **Undefined `db` variable in Audit Log example**: The `auditWatcher()` function used `client.db("crm")` inline for creating the stream but then referenced a bare `db` variable (never defined in the function scope) when inserting into the `auditLog` collection. Fixed by assigning `const db = client.db("crm")` at the top of the function and using `db.watch()` for the stream.

## Review Notes
- The mermaid diagram describes the driver as opening a "tailable cursor on oplog." Technically, the driver uses a `$changeStream` aggregation stage, but this is an acceptable simplification for a conceptual diagram.
- The resume token example uses an `async` callback with `.on("change", ...)`. Errors thrown inside the async callback won't propagate to the event emitter's error handler. The `try/catch` inside the callback mitigates this, so the pattern is functional as written.
- MongoDB 6.0+ introduced `fullDocumentBeforeChange` option for change streams, which could be mentioned as an enhancement in a future update but is not an error in the current post.
