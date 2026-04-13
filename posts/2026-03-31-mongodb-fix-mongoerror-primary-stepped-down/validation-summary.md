# Validation Summary: How to Fix MongoError: Primary Stepped Down During Write in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (replica sets, elections, retryable writes, transactions)
- MongoDB Node.js Driver (MongoClient, session.withTransaction)
- MongoDB Shell (rs.status, rs.conf, rs.reconfig)

## Sources Consulted
- [MongoDB Retryable Writes Documentation](https://www.mongodb.com/docs/manual/core/retryable-writes/) - verified retryWrites default version
- [MongoDB Error Codes Reference](https://www.mongodb.com/docs/manual/reference/error-codes/) - verified error codes 10107, 189, 91
- [MongoDB Replica Set Configuration](https://www.mongodb.com/docs/manual/reference/replica-configuration/) - verified electionTimeoutMillis default
- [MongoDB replSetGetStatus Command](https://www.mongodb.com/docs/manual/reference/command/replsetgetstatus/) - verified optimeDurableDate field
- [MongoDB Node.js Driver Transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/) - verified withTransaction() retry behavior
- [MongoDB error_codes.yml (source)](https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.yml) - verified error code names

## Issues Found
1. **Incorrect retryWrites default version in comment**: The code comment stated `retryWrites: true, // enabled by default in driver 3.6+`. Retryable writes were *introduced* in MongoDB 3.6 but were *not enabled by default* until MongoDB 4.2-compatible drivers. Fixed the comment to read `// enabled by default in MongoDB 4.2+ drivers`.

2. **Misleading label for `optimeDurableDate`**: The diagnostic script labeled `optimeDurableDate` as `lag=`, but this field is an ISODate timestamp of the last durable oplog entry, not a replication lag value. Changed the label from `lag=` to `lastDurable=` for accuracy.

## Review Notes
- The `withTransaction()` retry pattern in Fix 3 wraps the API in an additional outer retry loop for `TransientTransactionError`. Since `withTransaction()` already handles `TransientTransactionError` retries internally, the outer loop is somewhat redundant. However, this pattern is documented in official MongoDB examples as an additional resilience layer, so it is not incorrect.
- The election time estimate of "10-30 seconds" is on the high end for modern MongoDB (4.0+), where elections typically complete in under 12 seconds with default settings. The range is acceptable as a general estimate covering various network conditions.
- All error codes (10107 NotWritablePrimary, 189 PrimarySteppedDown, 91 ShutdownInProgress) are verified correct.
- The `electionTimeoutMillis` default of 10000ms (10 seconds) is confirmed correct.
