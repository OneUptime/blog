# Validation Summary: How to Use Multi-Document Transactions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, replica sets, sharded clusters)
- MongoDB Node.js Driver (v5+/v6+)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: Drivers API — Transactions — https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB Node.js Driver API: ClientSession.withTransaction — https://mongodb.github.io/node-mongodb-native/6.0/classes/ClientSession.html
- MongoDB Manual: currentOp — https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB Manual: serverStatus — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Manual: transactionLifetimeLimitSeconds — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.transactionLifetimeLimitSeconds

## Issues Found
1. **`startTransaction()` placed outside the retry loop in manual retry pattern.** In the `executeTransaction()` function, `session.startTransaction()` was called once before `runTransactionWithRetry()`. When a `TransientTransactionError` occurs, the server aborts the transaction. Retrying the callback without calling `startTransaction()` again means the retried operations would execute outside a transaction context. Fixed by moving `session.startTransaction()` inside the `runTransactionWithRetry()` function, immediately before `await txnFunc(session)`, so a fresh transaction is started on each retry attempt. Removed the now-redundant `session.startTransaction()` call from `executeTransaction()`.

## Review Notes
- The code examples assume MongoDB Node.js driver v5+ or v6+ (e.g., `findOneAndUpdate` returning the document directly rather than a `{ value }` wrapper, and `withTransaction` propagating the callback's return value). This is appropriate for a 2026 publication but may not work with driver v4 or earlier.
- The `new (require("mongodb").ObjectId)()` pattern on line 71 is functional but unconventional; a top-level import would be cleaner. Not a correctness issue.
- The post correctly notes that sharded cluster transactions require MongoDB 4.2+ and that the default `transactionLifetimeLimitSeconds` is 60 seconds.
