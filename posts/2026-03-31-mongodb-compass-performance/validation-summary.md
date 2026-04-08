# Validation Summary: How to Use MongoDB Compass for Performance Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Compass (GUI)
- MongoDB Explain Plan
- MongoDB Profiler
- MongoDB Indexes
- MongoDB Node.js Driver (connection pooling example)
- mongosh

## Sources Consulted
- MongoDB Compass Documentation: https://www.mongodb.com/docs/compass/current/
- MongoDB Compass Performance Tab: https://www.mongodb.com/docs/compass/current/performance/
- MongoDB Explain Plan documentation: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB net.maxIncomingConnections documentation: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.maxIncomingConnections
- MongoDB Profiler documentation: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Node.js Driver connection options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB sort memory limit: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.internalQueryExecMaxBlockingSortBytes

## Issues Found
- **Incorrect `net.maxIncomingConnections` default value**: The post stated the default was "1,000,000 but often limited by the OS." The actual MongoDB default for `net.maxIncomingConnections` is 65536. Corrected the value and removed the misleading qualifier about OS limits.

## Review Notes
- The Performance tab metrics listed (Operations, Network, Memory, Connections) are accurate. The "Disk: read and write IOPS" metric may not be present in all versions of Compass — some versions show "Read & Write" latency metrics instead of raw IOPS. This is minor and version-dependent, so it was left as-is.
- The explain plan stage names (IXSCAN, COLLSCAN, FETCH, SORT, PROJECTION) are correct. MongoDB internally uses more specific projection stage names (PROJECTION_DEFAULT, PROJECTION_SIMPLE, PROJECTION_COVERED), but "PROJECTION" is an acceptable simplification for a tutorial.
- The profiler syntax `db.setProfilingLevel(1, { slowms: 100 })` is correct.
- The Node.js driver connection options (`maxPoolSize`, `minPoolSize`, `serverSelectionTimeoutMS`, `socketTimeoutMS`) are all valid current options.
- The 100MB in-memory sort limit is correct (configurable via `internalQueryExecMaxBlockingSortBytes`).
- The compound index advice for covering both filter and sort is correct and follows MongoDB best practices (equality fields first, then sort fields).
