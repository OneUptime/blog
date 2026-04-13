# Validation Summary: How to Troubleshoot MongoDB Write Performance Degradation

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (server, WiredTiger storage engine, replica sets)
- MongoDB Node.js Driver (collection API, write concern options, bulk operations)
- mongosh / MongoDB Shell (serverStatus, profiler, currentOp, indexStats)

## Sources Consulted
- MongoDB documentation on Write Concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB documentation on serverStatus: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB documentation on $indexStats: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB documentation on WiredTiger storage engine cache: https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB
- MongoDB documentation on Database Profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB 5.0 release notes (default write concern change): https://www.mongodb.com/docs/manual/release-notes/5.0/

## Issues Found
1. **Incorrect default write concern**: The post stated `w: 1 (default)` for write concern. Since MongoDB 5.0, the default write concern for replica sets is `w: "majority"`, not `w: 1`. Fixed the comment on the `w: 1` line to remove "(default)" and updated the `w: "majority"` comment to note it is the default since MongoDB 5.0.

## Review Notes
- The post mixes MongoDB Shell syntax (`db.serverStatus()`, `db.orders.getIndexes()`) with Node.js driver syntax (`await db.collection(...).insertOne(...)`). This is common in MongoDB tutorials and not technically incorrect, but readers should be aware the two contexts are different.
- The WiredTiger cache stat field names (`"bytes currently in the cache"`, `"maximum bytes configured"`, `"tracked dirty bytes in the cache"`, `"pages evicted by application threads"`) are correct for current MongoDB versions.
- The counter sharding pattern for hot documents is a well-established best practice.
- The `globalLock.currentQueue` fields shown are accurate for current MongoDB versions.
