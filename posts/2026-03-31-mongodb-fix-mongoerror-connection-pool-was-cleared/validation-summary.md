# Validation Summary: How to Fix MongoError: Connection Pool Was Cleared in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (server)
- MongoDB Node.js Driver (MongoClient API, CMAP events)
- Retryable Writes / Retryable Reads
- Connection Pool Management (CMAP specification)

## Sources Consulted
- MongoDB Retryable Writes Documentation (https://www.mongodb.com/docs/v7.0/core/retryable-writes/)
- MongoDB Retryable Writes Specification (https://github.com/mongodb/specifications/blob/master/source/retryable-writes/retryable-writes.md)
- MongoDB CMAP Specification (https://github.com/mongodb/specifications/blob/master/source/connection-monitoring-and-pooling/connection-monitoring-and-pooling.md)
- MongoDB Node.js Driver Connection Pool Documentation (https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/)
- MongoDB Node.js Driver v6.0 MongoClientOptions API (https://mongodb.github.io/node-mongodb-native/6.0/interfaces/MongoClientOptions.html)
- MongoDB Node.js Driver source: connection_pool_events.ts (https://github.com/mongodb/node-mongodb-native/blob/main/src/cmap/connection_pool_events.ts)

## Issues Found

1. **Incorrect retryWrites default version reference (Step 2)**: The post stated retryable writes are enabled "by default in driver version 3.6+". This conflates MongoDB server version 3.6 (which introduced retryable writes) with when the default changed. Retryable writes default to `true` in drivers compatible with MongoDB 4.2+, not 3.6. Changed to "drivers compatible with MongoDB 4.2+".

2. **Incorrect `connectionPoolCleared` event property logged as reason (Step 6)**: The post logged `event.serviceId` with the label "Reason:", but `serviceId` is an optional ObjectId only present in load-balanced deployments to identify which backend service's connections were cleared. It is not the reason for the pool clearing. In most deployments it will be `undefined`. Removed the misleading `serviceId` logging.

## Review Notes
- `waitQueueTimeoutMS` is still a valid option in the current Node.js driver but is deprecated in favor of the newer `timeoutMS` (Client Side Operations Timeout). It may be removed in a future major version. The post's usage is acceptable for now.
- The retry logic in Step 5 manually implements retries, which is reasonable for handling `MongoPoolClearedError` specifically. However, for retryable write errors, the driver already handles retries automatically when `retryWrites: true`, so manual retry is primarily useful for read operations or operations the driver doesn't automatically retry.
- The `ConnectionPoolClearedEvent` does not expose the reason for clearing. The actual root cause must be correlated from preceding error logs, which the post correctly explains in Step 1.
