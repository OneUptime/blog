# Validation Summary: How to Monitor MongoDB with Profiler and Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB database profiler
- MongoDB `mongod.conf` operation profiling settings
- MongoDB `serverStatus`
- MongoDB `$currentOp` aggregation stage
- MongoDB replica set status
- MongoDB `$indexStats`
- JavaScript / mongosh scripts

## Sources Consulted
- MongoDB Manual: Database Profiler - https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: `db.setProfilingLevel()` - https://www.mongodb.com/docs/manual/reference/method/db.setprofilinglevel/
- MongoDB Manual: Database Profiler Output - https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Manual: Self-Managed Configuration File Options - https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual: `serverStatus` - https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB Manual: `$currentOp` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentop/
- MongoDB Manual: `db.currentOp()` - https://www.mongodb.com/docs/manual/reference/method/db.currentop/
- MongoDB Manual: `$indexStats` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/
- MongoDB Manual: `db.getCollection()` - https://www.mongodb.com/docs/manual/reference/method/db.getcollection/
- MongoDB Manual: `db.getCollectionNames()` - https://www.mongodb.com/docs/manual/reference/method/db.getcollectionnames/
- MongoDB Manual: `rs.status()` - https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Manual: `replSetGetStatus` - https://www.mongodb.com/docs/manual/reference/command/replsetgetstatus/

## Issues Found
- The post described dynamic profiler configuration as per-database without noting that `slowms` and `sampleRate` are global for the `mongod` process. Updated the wording to distinguish the per-database profiling level from process-wide slow operation threshold and sample rate.
- The `operationProfiling.mode` comment used numeric profiler levels even though the YAML setting accepts string values. Updated the comment to list `off`, `slowOp`, and `all`.
- The active operations example used `db.currentOp()`, which MongoDB documentation recommends replacing with the `$currentOp` aggregation stage in current versions. Replaced the example with `db.getSiblingDB("admin").aggregate([{ $currentOp: ... }, { $match: ... }])`.
- The metrics collector called `rs.status()` without handling standalone deployments and printed the unresolved async result. Added a helper that catches non-replica-set errors and changed the final output to `printjson(await collectMetrics())`.
- The index usage snippets used dynamic collection access and Node-driver-style `db.collection(...)` patterns. Updated them to use mongosh's `db.getCollection(...)`.
- The alerts example defined a cache eviction threshold that it never evaluated. Removed the unused threshold to keep the sample internally consistent.

## Review Notes
- The post is technically relevant and includes multiple MongoDB configuration and mongosh examples, so it was reviewed as a code-oriented tutorial.
- The server metrics examples are intentionally basic. Production dashboards should generally calculate operation rates and cache eviction rates from deltas between samples rather than treating cumulative `serverStatus` counters as rates.
