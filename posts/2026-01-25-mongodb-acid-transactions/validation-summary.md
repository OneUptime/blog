# Validation Summary: How to Execute ACID Transactions in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB multi-document transactions
- MongoDB Node.js driver
- JavaScript
- ACID transactions
- Read concern and write concern

## Sources Consulted
- MongoDB Manual: Transactions - https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: Transactions Production Considerations - https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB Manual: Read Concern - https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Node.js Driver: Transactions - https://www.mongodb.com/docs/drivers/node/current/crud/transactions/

## Issues Found
- The post said `maxCommitTimeMS` increases the transaction timeout. In the Node.js driver transaction options, `maxCommitTimeMS` limits the commit operation, while the default overall transaction lifetime is controlled by MongoDB's `transactionLifetimeLimitSeconds` server parameter. I changed the code comment to say it sets a timeout for the commit operation.
- The post claimed a maximum 16MB total size for transaction operations. MongoDB documentation says the old 16MB total transaction oplog limit has been removed; each oplog entry still must fit within the 16MB BSON document size limit. I updated the size limit bullet accordingly.
- The post claimed a maximum of 1000 documents modified in a single transaction. I did not find this as a current official hard limit in MongoDB documentation, so I changed it to guidance to keep modified document counts small to avoid long runtimes and cache pressure.

## Review Notes
The examples use the current Node.js driver transaction APIs, pass the session to operations, and correctly describe `withTransaction` retry handling for transient transaction errors and unknown commit results. Future improvements could include showing retry logic in the first manual transaction example and adding a note to avoid parallel operations such as `Promise.all()` within a single transaction.
