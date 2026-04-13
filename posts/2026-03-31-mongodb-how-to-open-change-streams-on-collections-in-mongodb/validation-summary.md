# Validation Summary: How to Open Change Streams on Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- Node.js MongoDB Driver
- PyMongo (Python MongoDB Driver)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver Change Stream API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/
- PyMongo Change Streams documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.watch
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/

## Issues Found
- **Version requirements for database/deployment-level streams**: The requirements section listed "MongoDB 3.6+" as a blanket requirement for all stream levels. However, database-level and deployment-level change streams were introduced in MongoDB 4.0, not 3.6. Collection-level streams were the only type available in 3.6. Fixed by adding version annotations to each stream level bullet point.

## Review Notes
- All Node.js code examples use correct and current MongoDB Node.js driver APIs (v4+/v5+/v6+).
- The change event structure, operation types table, `fullDocument: 'updateLookup'` option, async iteration pattern, and graceful shutdown handling are all accurate.
- The PyMongo example correctly uses the context manager pattern with `collection.watch()`.
- The note about `updateLookup` performing an extra read with latency/consistency trade-offs is accurate — the lookup reads the current document version, which may differ from the version at the time of the change event if concurrent writes occurred.
- The post mentions resume tokens in the summary but defers coverage to a separate guide, which is reasonable.
