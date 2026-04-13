# Validation Summary: How to Tune maxIncomingConnections for High-Concurrency MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (server configuration, WiredTiger storage engine)
- MongoDB Atlas (connection tier limits)
- MongoDB Node.js Driver (connection pool options)
- PyMongo (Python driver connection pool options)
- Linux system administration (ulimit, systemd)

## Sources Consulted
- MongoDB Self-Managed Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Node.js Driver Connection Pools: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- MongoDB Connection Pool Performance Tuning: https://www.mongodb.com/docs/manual/tutorial/connection-pool-performance-tuning/
- MongoDB Atlas Service Limits: https://www.mongodb.com/docs/atlas/reference/atlas-limits/
- MongoDB WiredTiger Storage Engine: https://www.mongodb.com/docs/manual/core/wiredtiger/
- PyMongo 4 Migration Guide: https://pymongo.readthedocs.io/en/stable/migrate-to-pymongo4.html
- PyMongo MongoClient Documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- MongoDB Community Forums on memory per connection: https://www.mongodb.com/community/forums/t/memory-allocated-per-connection/12526

## Issues Found
1. **Node.js driver `maxPoolSize` default was wrong**: The inline comment stated the default is 10, but the actual default for the MongoDB Node.js driver 4.x+ is 100. Changed `(default: 10)` to `(default: 100)`.

2. **Atlas M60 connection limit was wrong**: The table listed M60 max connections as 16,000, but the actual Atlas limit for M60 is 32,000. The 16,000 figure corresponds to the M50 tier. Corrected to 32,000.

3. **WiredTiger cache formula was imprecise**: The post stated "WiredTiger cache: 8GB (half of RAM)" for a 16GB server. The actual WiredTiger default internal cache size is `50% of (RAM - 1GB)`, which for 16GB yields 7.5GB, not 8GB. Updated the calculation example to use the correct formula and recalculated the connection memory budget accordingly (4.5GB / ~4500 connections).

4. **`current` field description was misleading**: The `current` field from `db.serverStatus().connections` was described as "Active connections", but `current` represents all open connections (including idle ones). The `active` field is the one that shows connections currently processing operations. Changed to "Total open connections (including idle)".

## Review Notes
- The default `maxIncomingConnections` value of 1,000,000 as stated in the post applies to Windows. On Linux, the default is calculated as `(RLIMIT_NOFILE / 2) * 0.8`. Starting in MongoDB 8.1 (backported to 8.0.16 and 7.0.27), higher values are silently capped on Linux. The post's general point that the default is effectively limited by the OS is correct, but readers on Linux should be aware the actual default may differ.
- The claim that `setParameter` for `maxIncomingConnections` works at runtime from MongoDB 4.4+ could not be conclusively verified against a specific changelog entry, though MongoDB documentation does reference it as a runtime-settable parameter.
- The Atlas connection limits can change over time as MongoDB updates tier specifications. Readers should verify against current Atlas documentation.
- The PyMongo code example uses `waitQueueTimeoutMS`, which is still valid in PyMongo 4.x (only `waitQueueMultiple` was removed in 4.0).
