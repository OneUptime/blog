# Validation Summary: How WiredTiger MVCC Enables Concurrent Reads and Writes in MongoDB

## Status
validated

## Post Type
Technical explainer / Guide

## Technologies Covered
- MongoDB (multi-document transactions, snapshot isolation)
- WiredTiger storage engine (MVCC, version pinning, cache management)
- MongoDB Node.js driver (session and transaction APIs)

## Sources Consulted
- MongoDB documentation on WiredTiger storage engine: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB documentation on transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation on read concern "snapshot": https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/
- MongoDB documentation on `transactionLifetimeLimitSeconds`: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.transactionLifetimeLimitSeconds
- MongoDB documentation on `currentOp`: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB Node.js driver documentation on transactions: https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/

## Issues Found
- **Mismatched text and code in "Snapshot Isolation" section**: The text after the transaction code example stated "Both reads in the transaction see the same snapshot, even if another transaction modified those documents between the two reads." However, the code example contains only one explicit read (`findOne`) and two writes (`updateOne`), not two reads. Fixed to: "All operations in the transaction read from the same consistent snapshot, even if another transaction modified those documents concurrently."

## Review Notes
- The MVCC timeline example is accurate and clearly illustrates snapshot behavior.
- The transaction code examples use correct, current Node.js driver API (`startSession`, `startTransaction`, `commitTransaction`, `abortTransaction`, `hasErrorLabel`).
- The `readConcern: { level: "snapshot" }` and `writeConcern: { w: "majority" }` settings are correct for snapshot isolation.
- The retry pattern using `TransientTransactionError` label is the recommended MongoDB approach.
- The default `transactionLifetimeLimitSeconds` value of 60 seconds is correct.
- The `currentOp` command syntax and field names (`inprog`, `transaction`, `secs_running`) are accurate.
- The opening statement that MVCC works "without locks" is a slight simplification — WiredTiger does use intent locks at the collection level — but this is the standard way MVCC is described and is accurate in the context of document-level read/write concurrency.
