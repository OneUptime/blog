# Validation Summary: How to Use Bulk Operations with Transactions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, bulk operations, oplog)
- Node.js MongoDB driver (v4+/v5+/v6+)
- mongod and mongosh CLI tools

## Sources Consulted
- MongoDB Node.js Driver API documentation for `Collection.initializeOrderedBulkOp()` and `Collection.initializeUnorderedBulkOp()` — https://mongodb.github.io/node-mongodb-native/
- MongoDB Node.js Driver `BulkWriteResult` class documentation — confirms property names `modifiedCount`, `insertedCount`, `matchedCount`, etc.
- MongoDB Manual: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: `session.withTransaction()` — https://www.mongodb.com/docs/manual/reference/method/Session.withTransaction/
- MongoDB Manual: Transaction limits (60-second lifetime, 16 MB oplog cap) — https://www.mongodb.com/docs/manual/core/transactions-production-consideration/

## Issues Found
1. **`debitResult.nModified` should be `debitResult.modifiedCount`** — The property `nModified` was used in the legacy MongoDB Node.js driver (v3.x). In the current driver (v4+), the `BulkWriteResult` object uses `modifiedCount`. Changed `debitResult.nModified` to `debitResult.modifiedCount` on the verification line.

## Review Notes
- The post uses `initializeOrderedBulkOp()` and `initializeUnorderedBulkOp()`, which are the older bulk API. The newer `collection.bulkWrite()` method is generally preferred in modern code, but the older methods are still supported and not formally deprecated, so this is not an error.
- The pattern of passing `{ session }` to the bulk operation initializer is correct and works in the current driver.
- All transaction options (`readPreference`, `readConcern`, `writeConcern`, `maxCommitTimeMS`) are valid.
- The stated limitations (60-second default timeout, 16 MB oplog cap) are accurate per MongoDB documentation.
- The `withTransaction` retry behavior description is accurate.
