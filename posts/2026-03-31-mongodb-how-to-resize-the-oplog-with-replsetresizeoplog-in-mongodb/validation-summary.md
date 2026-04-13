# Validation Summary: How to Resize the Oplog with replSetResizeOplog in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog)
- replSetResizeOplog admin command
- mongosh shell
- mongod.conf configuration
- MongoDB Atlas

## Sources Consulted
- MongoDB documentation on replSetResizeOplog: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB documentation on the oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB documentation on rs.printReplicationInfo(): https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/
- MongoDB documentation on BSON Timestamp type: https://www.mongodb.com/docs/manual/reference/bson-types/#timestamps
- MongoDB documentation on replication.oplogSizeMB configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-replication.oplogSizeMB

## Issues Found

1. **Incorrect Timestamp property access (`getHighBits()` -> `.t`)**
   - **What was wrong:** The oplog calculation code used `end.ts.getHighBits()` and `start.ts.getHighBits()` to access the time component of BSON Timestamps. `getHighBits()` is a method on `NumberLong`, not on `Timestamp` objects. In mongosh, the correct property for the seconds component of a Timestamp is `.t`.
   - **What was changed:** Replaced `end.ts.getHighBits() - start.ts.getHighBits()` with `end.ts.t - start.ts.t`.
   - **Why:** This code would throw an error in mongosh since `Timestamp` objects do not have a `getHighBits()` method.

2. **Incorrect claim that replSetResizeOplog changes are temporary (MongoDB 4.0+)**
   - **What was wrong:** The post stated "`replSetResizeOplog` is temporary - it resets to the configured size on restart." This was true only for MongoDB 3.6. Starting in MongoDB 4.0, the change is persistent and survives restarts.
   - **What was changed:** Rewrote the "Making the Resize Permanent" section (now "Persisting the Resize") to correctly state that changes persist from MongoDB 4.0+, while still recommending setting `oplogSizeMB` in `mongod.conf` as good practice. Updated the Summary section accordingly.
   - **Why:** Since MongoDB 3.6 reached EOL in April 2021, virtually all current deployments use 4.0+, making the original claim misleading and potentially causing unnecessary extra configuration steps.

3. **Misleading Atlas API curl command removed**
   - **What was wrong:** The curl command shown for Atlas API was a PATCH request that modified `replicationSpecs` and `regionsConfig` (cluster topology), not oplog size. It was irrelevant to oplog resizing and could confuse readers.
   - **What was changed:** Removed the misleading curl command and simplified the Atlas paragraph to state that oplog size is automatically managed and can be configured through the Atlas UI.
   - **Why:** The API call shown had nothing to do with oplog sizing and could lead readers to make unintended cluster topology changes.

## Review Notes
- Starting in MongoDB 4.4, `replSetResizeOplog` also supports a `minRetentionHours` parameter to set a minimum oplog retention period. The post doesn't mention this feature, which could be a useful addition in a future update.
- The post uses `db.oplog.rs.stats()` which, while still functional, has been superseded by the `$collStats` aggregation stage in newer MongoDB versions. Not an error, but worth noting for future updates.
- The `mongosh` connection string in Step 2 appears inside a JavaScript code block, mixing shell and JS commands. This is a common blog convention and not technically wrong, but could be clearer with separate code blocks.
