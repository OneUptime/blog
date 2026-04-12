# Validation Summary: How to Configure Write Concern with journal:true in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (Write Concern, Journaling, WiredTiger storage engine)
- MongoDB Node.js Driver (`mongodb` package, `WriteConcern` class)
- MongoDB connection string URI format

## Sources Consulted
- MongoDB Manual: Write Concern specification (https://www.mongodb.com/docs/manual/reference/write-concern/)
- MongoDB Manual: Journaling (https://www.mongodb.com/docs/manual/core/journaling/)
- MongoDB Manual: `--nojournal` option and `storage.journal.commitIntervalMs` (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.journal.commitIntervalMs)
- MongoDB Manual: Connection String URI Format (https://www.mongodb.com/docs/manual/reference/connection-string/)
- MongoDB Node.js Driver API: WriteConcern class (https://mongodb.github.io/node-mongodb-native/)
- MongoDB Manual: WiredTiger Storage Engine (https://www.mongodb.com/docs/manual/core/wiredtiger/)

## Issues Found
1. **`--nojournal` behavior with `j: true` (line 120)**: The post claimed that when `mongod` is started with `--nojournal`, the `j: true` write concern parameter is "treated as `j: false`." This is incorrect. According to MongoDB documentation, specifying `j: true` when journaling is disabled causes the write operation to **fail with an error**, not silently degrade to `j: false`. Fixed the statement to accurately reflect this behavior.

## Review Notes
- The performance latency numbers in the comparison table are illustrative/approximate rather than from official benchmarks. They are reasonable estimates for the storage types listed but should not be cited as authoritative figures.
- Starting in MongoDB 5.0, the default write concern for replica sets is `{ w: "majority" }` and `writeConcernMajorityJournalDefault` defaults to `true`, meaning journal acknowledgment is effectively the default for replica sets. The post doesn't mention this but it's not incorrect — just a nuance that could enhance the post in a future update.
- The Node.js driver example uses the positional constructor `new WriteConcern(w, wtimeoutMS, j)` which is valid but the options-object form may be more readable in modern code. Not an error.
- The `--nojournal` flag was fully removed in MongoDB 4.2 (deprecated in 4.0 for WiredTiger). The post says "MongoDB 4.0+" which is accurate for WiredTiger specifically.
