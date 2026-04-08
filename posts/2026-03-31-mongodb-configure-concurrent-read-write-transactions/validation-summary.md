# Validation Summary: How to Configure Concurrent Read and Write Transactions in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Shell (mongosh)
- WiredTiger concurrency ticket system
- MongoDB multi-document transactions
- MongoDB read concerns

## Sources Consulted
- MongoDB official documentation: `wiredTigerConcurrentReadTransactions` and `wiredTigerConcurrentWriteTransactions` server parameters (https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.wiredTigerConcurrentReadTransactions)
- MongoDB official documentation: `db.serverStatus()` output including `wiredTiger.concurrentTransactions` (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: `globalLock.currentQueue` (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#mongodb-serverstatus-serverstatus.globalLock.currentQueue)
- MongoDB official documentation: `transactionLifetimeLimitSeconds` (https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.transactionLifetimeLimitSeconds)
- MongoDB official documentation: Read Concern "linearizable" (https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/)
- MongoDB official documentation: `db.getCollection()` (https://www.mongodb.com/docs/manual/reference/method/db.getCollection/)

## Issues Found
- **`db.collection()` is Node.js driver syntax, not mongo shell syntax**: The Read Concern section used `db.collection("orders").findOne(...)` which is the MongoDB Node.js driver API. The rest of the post consistently uses mongo shell syntax (`db.serverStatus()`, `db.adminCommand()`). Changed to `db.getCollection("orders").findOne(...)` which is the correct mongo shell equivalent.

## Review Notes
- In MongoDB 7.0+, the execution control mechanism evolved from the simple ticket-based system to a priority-based admission control system. The `wiredTigerConcurrentReadTransactions` and `wiredTigerConcurrentWriteTransactions` parameters still exist but the underlying behavior differs. The post does not specify a MongoDB version, so this is worth noting for readers on newer versions.
- The `globalLock.currentQueue.readers/writers` metrics reflect operations waiting for locks at the server level, which can correlate with ticket exhaustion but are not a direct measure of WiredTiger ticket queuing specifically. The advice is still practically useful.
- The default value of `transactionLifetimeLimitSeconds` is 60 seconds; the post's example of setting it to 30 is a valid and reasonable configuration.
