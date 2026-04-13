# Validation Summary: How to Implement Blue-Green Deployment with MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, change streams, transactions, collections)
- Node.js MongoDB Driver
- Blue-green deployment pattern

## Sources Consulted
- MongoDB Node.js Driver documentation for transactions: https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver API for `Collection.find()`, `Collection.watch()`, `Collection.countDocuments()`, `Collection.drop()`
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found
1. **Missing session parameter on `find()` inside transaction** (line 45): The `db.users_blue.find({})` call inside the transaction block did not pass the `session` option. MongoDB requires the session to be passed to every operation within a transaction to ensure snapshot isolation and transactional consistency. Without it, the read occurs outside the transaction boundary. Fixed to `db.users_blue.find({}, { session })`.

## Review Notes
- The transaction-based bulk copy in Strategy 2 wraps the entire collection copy in a single transaction. For very large collections, this could exceed MongoDB's default 60-second transaction timeout (`transactionLifetimeLimitSeconds`). In production, batching or a non-transactional approach with idempotent writes would be more practical. This is a scalability consideration rather than a correctness error.
- The change stream handler does not cover the `replace` operation type, which is a distinct event from `update` in MongoDB change streams. For a production sync, handling `replace` events would be important. This is a completeness note, not an error in the presented code.
- The async callback pattern in `changeStream.on("change", async ...)` means errors inside the handler will produce unhandled promise rejections rather than being caught by the event emitter. A production implementation should add error handling around the handler body.
