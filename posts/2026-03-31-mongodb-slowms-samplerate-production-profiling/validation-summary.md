# Validation Summary: How to Use slowms and sampleRate for Profiling in Production MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (database profiler, `system.profile` capped collection)
- `slowms` threshold configuration
- `sampleRate` sampling configuration
- `mongod.conf` profiling configuration (`operationProfiling`)
- MongoDB shell methods (`db.setProfilingLevel`, `db.getProfilingStatus`, `db.system.profile.stats`)

## Sources Consulted
- MongoDB official documentation: `db.setProfilingLevel()` — https://www.mongodb.com/docs/manual/reference/method/db.setprofilinglevel/
- MongoDB official documentation: `db.getProfilingStatus()` — https://www.mongodb.com/docs/manual/reference/method/db.getprofilingstatus/
- MongoDB official documentation: Database Profiler tutorial — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB official documentation: Configuration Options (`operationProfiling`) — https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB official documentation: `collStats` command — https://www.mongodb.com/docs/manual/reference/command/collstats/
- MongoDB v3.6 documentation for `sampleRate` introduction — https://www.mongodb.com/docs/v3.6/tutorial/manage-the-database-profiler/

## Issues Found

1. **Incorrect claim about `system.profile` location (line 15)**: The post stated that writing to `system.profile` "is itself a write to the `local` database." This is incorrect — `system.profile` is a capped collection that exists in each database where profiling is enabled, not in the `local` database. The `local` database is used for replication metadata (oplog). **Fixed** by changing to: "a capped collection in the profiled database."

2. **Incorrect version for `slowOpSampleRate` config option (line 86)**: The post stated that `slowOpSampleRate` "was added in MongoDB 4.0." The `sampleRate`/`slowOpSampleRate` option was actually introduced in MongoDB 3.6 for `mongod` instances. MongoDB 4.0 extended support for this option to `mongos` (router) instances. **Fixed** by changing to: "was added in MongoDB 3.6 (extended to `mongos` in 4.0)."

## Review Notes
- All `db.setProfilingLevel()` and `db.getProfilingStatus()` syntax is correct and current.
- The `mongod.conf` YAML configuration format and field names (`mode: slowOp`, `slowOpThresholdMs`, `slowOpSampleRate`) are accurate.
- The `db.system.profile.stats()` approach for monitoring collection fill rate is valid — `system.profile` is a capped collection and `collStats` returns `size`, `maxSize`, and `count` fields as used in the code.
- The `autoTuneProfiling()` function references a `measureP95Latency()` placeholder correctly labeled as a custom function — this is appropriately presented as pseudocode.
- The description of `sampleRate` behavior at profiling level 1 (sampling only operations exceeding `slowms`) is accurate per official documentation.
