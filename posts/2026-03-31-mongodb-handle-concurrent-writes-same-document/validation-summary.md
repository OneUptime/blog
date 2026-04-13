# Validation Summary: How to Handle Concurrent Writes to the Same Document in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Node.js Driver (retryable writes, transactions)
- Mongoose ODM (version key, findOneAndUpdate)
- JavaScript / Node.js

## Sources Consulted
- MongoDB WiredTiger Storage Engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB FAQ: Concurrency: https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB Retryable Writes: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Transactions in Applications (Drivers API): https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB Error Codes reference: https://www.mongodb.com/docs/manual/reference/error-codes/
- Mongoose Schemas - versionKey: https://mongoosejs.com/docs/guide.html

## Issues Found

1. **Conflation of MVCC and document-level write concurrency**: The post originally stated WiredTiger provides "document-level concurrency control using MVCC", implying MVCC is the mechanism for write-write concurrency. In reality, these are two separate WiredTiger features: document-level locking handles write-write concurrency for different documents, while MVCC allows readers to proceed without blocking writers. Fixed the sentence to correctly describe both mechanisms.

2. **Incorrect attribution of write conflict handling to retryable writes**: The post originally stated "Outside transactions, MongoDB's driver-level retryable writes handle most transient conflicts automatically." This is inaccurate. Outside transactions, WiredTiger transparently retries write conflicts at the storage engine level inside the `mongod` server — the application and driver never see these conflicts. The driver's retryable writes feature handles a different category of issues: network errors and primary failovers. Fixed to correctly attribute write conflict handling to the storage engine.

3. **Retryable writes shown as opt-in when they are the default**: The post showed `retryWrites=true` in the connection string without noting that this has been the default since MongoDB 4.2-compatible drivers. Added clarification that retryable writes are enabled by default, and added a note distinguishing retryable writes (failover/network) from storage engine write conflict resolution.

## Review Notes
- The transaction retry loop uses `while (true)` with no maximum retry count or backoff. This matches MongoDB's official documentation examples but could be improved with a retry limit and exponential backoff for production use.
- The optimistic locking example uses Mongoose's built-in `__v` field directly. While this works, the post correctly advises using a separate `version` field to avoid interference with Mongoose's own array versioning. For a stronger optimistic concurrency solution, Mongoose's `optimisticConcurrency` schema option could also be mentioned in a future update.
- The `retryWrites=true` connection string example is not wrong (it's valid and explicit), but readers should understand it's redundant for modern drivers.
