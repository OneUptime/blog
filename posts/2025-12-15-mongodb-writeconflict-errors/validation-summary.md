# Validation Summary: How to Fix 'WriteConflict' Errors in MongoDB

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MongoDB
- WiredTiger storage engine
- MongoDB transactions
- MongoDB Node.js driver
- JavaScript

## Sources Consulted
- MongoDB Manual: FAQ Concurrency - https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB Manual: WiredTiger Storage Engine - https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: Transactions in Applications - https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB Manual: Retryable Writes - https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Manual: Production Considerations for Transactions - https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB Manual: serverStatus Command - https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB Manual: db.setProfilingLevel() - https://www.mongodb.com/docs/manual/reference/method/db.setprofilinglevel/
- MongoDB Node.js Driver Docs: Modify Documents - https://www.mongodb.com/docs/drivers/node/current/crud/update/modify/
- MongoDB Node.js Driver API: Collection.findOneAndUpdate options - https://mongodb.github.io/node-mongodb-native/

## Issues Found
- The monitoring example incorrectly reported `status.wiredTiger.concurrentTransactions.write.out` as a write conflict count. That field represents write transaction ticket usage, not write conflicts. Updated the example to use the documented WiredTiger `status.wiredTiger.transaction['update conflicts']` metric.
- The summary described retry logic as "Automatic retries with exponential backoff," which could imply MongoDB automatically applies the application's backoff strategy. Updated it to "Retry transactions with exponential backoff" to match the article's application-level transaction retry guidance.

## Review Notes
The retry examples are illustrative and use the MongoDB driver's core transaction API style. For production transaction retry helpers, MongoDB's official guidance also distinguishes between retrying the whole transaction for `TransientTransactionError` and retrying only the commit for `UnknownTransactionCommitResult`.
