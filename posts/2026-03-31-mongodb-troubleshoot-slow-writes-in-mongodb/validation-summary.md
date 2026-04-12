# Validation Summary: How to Troubleshoot Slow Writes in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (mongosh shell commands and Node.js driver)
- MongoDB Profiler (`system.profile`)
- MongoDB `$indexStats` aggregation stage
- MongoDB Write Concern
- MongoDB Bulk Write API
- MongoDB `$push`, `$each`, `$slice` update operators
- MongoDB `serverStatus()` for lock diagnostics

## Sources Consulted
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: `$indexStats` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB Manual: Write Concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual: `bulkWrite()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/
- MongoDB Manual: `$push` with `$slice` — https://www.mongodb.com/docs/manual/reference/operator/update/slice/
- MongoDB Manual: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: `serverStatus` — https://www.mongodb.com/docs/manual/reference/command/serverStatus/

## Issues Found
- **Outdated document relocation claim (Step 5):** The original text stated that unbounded array growth "causes documents to grow, requiring MongoDB to move them on disk and update array indexes." Document relocation was a concern with the legacy MMAPv1 storage engine, but WiredTiger (the default since MongoDB 3.2 and the only option since 4.2) uses a copy-on-write approach and does not relocate documents when they grow. Updated the explanation to cite the actual concerns: increased memory/cache pressure, larger document transfers over the network, and risk of hitting the 16MB BSON document size limit.

## Review Notes
- The post mixes mongosh shell syntax (Steps 1, 2, 5, 6) with Node.js driver syntax (Steps 3, 4). This is common in MongoDB tutorials and not incorrect, but readers should be aware of the context switch.
- The `$indexStats` caveat that stats reset on server restart is mentioned ("since last startup") which is good.
- The profiler query filters on `op: { $in: ['insert', 'update', 'remove', 'command'] }` — in MongoDB 4.2+, many write operations appear as `command` type, so including `command` is correct and important.
- All MongoDB shell methods (`setProfilingLevel`, `getIndexes`, `dropIndex`, `aggregate`, `serverStatus`) use correct syntax.
- All Node.js driver methods (`insertOne`, `bulkWrite`) use correct syntax and option formats.
- The `$push` with `$each` and `$slice: -100` syntax is correct for capping arrays.
