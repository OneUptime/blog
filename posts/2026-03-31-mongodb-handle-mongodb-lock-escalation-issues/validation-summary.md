# Validation Summary: How to Handle MongoDB Lock Escalation Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Shell (mongosh) commands: `serverStatus`, `currentOp`, `killOp`, `createIndex`
- MongoDB multi-document transactions
- MongoDB Node.js driver (application code examples)

## Sources Consulted
- MongoDB `serverStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB `killOp` command reference: https://www.mongodb.com/docs/manual/reference/command/killop/
- MongoDB `db.collection.createIndex()` reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Concurrency FAQ: https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB Transactions Production Considerations: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB 4.2 Index Build documentation: https://www.mongodb.com/docs/v4.2/core/index-creation/

## Issues Found
No technical issues found that warrant changes to the post content. All code examples are syntactically correct and use valid APIs. All technical claims about MongoDB's locking behavior are accurate.

## Review Notes
- **Title terminology**: The title refers to "lock escalation," but MongoDB does not have lock escalation in the traditional database sense (automatic promotion of fine-grained locks to coarse-grained locks, as in SQL Server or DB2). The post content actually describes **lock contention** — operations blocking each other due to exclusive locks at various granularities. The body text and description correctly use the term "lock contention." This is a terminology mismatch in the title, not a factual error in the technical content.
- **`maxTimeMS` with `createIndex`**: The use of `maxTimeMS` as an option to `db.collection.createIndex()` is not prominently documented in the official mongosh method reference. However, it is supported at the wire protocol / command level for the underlying `createIndexes` command, and MongoDB drivers generally forward it correctly. It works in practice but readers should be aware it is not an explicitly documented option for the shell helper method.
- **`globalLock` fields**: Verified correct — `activeClients.readers`, `activeClients.writers`, `currentQueue.readers`, `currentQueue.writers` are all documented fields in `serverStatus().globalLock`.
- **`killOp` syntax**: Verified correct per official documentation.
- **`maxTransactionLockRequestTimeoutMillis`**: Verified as a real MongoDB server parameter with a default of 5ms.
- **Index build behavior before/after 4.2**: Accurately described — hybrid index builds in 4.2+ hold exclusive locks only briefly at start and end.
- **Bucketed counter pattern**: A well-known MongoDB pattern, correctly implemented with `upsert: true` and aggregation via `reduce`.
- **Transaction code pattern**: Correct use of `startSession`, `startTransaction`, `commitTransaction`, `abortTransaction`, and `endSession`.
