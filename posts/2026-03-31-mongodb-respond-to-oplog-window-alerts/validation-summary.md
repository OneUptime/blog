# Validation Summary: How to Respond to MongoDB Oplog Window Alerts

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MongoDB (replica sets, oplog)
- MongoDB Atlas
- mongosh / MongoDB Shell

## Sources Consulted
- MongoDB `replSetResizeOplog` command documentation: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB `deleteMany` method documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.deleteMany/
- MongoDB configuration file options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB `replSetGetConfig` command documentation: https://www.mongodb.com/docs/manual/reference/command/replSetGetConfig/
- MongoDB `db.getReplicationInfo()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.getReplicationInfo/

## Issues Found

1. **Incorrect MongoDB version for `replSetResizeOplog`**: The post stated the command requires "MongoDB 4.4+" but `replSetResizeOplog` with the `size` parameter was introduced in MongoDB 3.6. Only the `minRetentionHours` parameter was added in 4.4. Changed "MongoDB 4.4+" to "MongoDB 3.6+".

2. **Incorrect command for checking oplog size**: The post used `db.adminCommand({ replSetGetConfig: 1 }).config.members` and suggested `rs.conf()` to check oplog size. Neither `replSetGetConfig` nor `rs.conf()` return oplog size information — they return replica set configuration (members, priorities, votes, etc.). Replaced with `db.getReplicationInfo()` which returns `logSizeMB`, `usedMB`, `timeDiff`, `timeDiffHours`, and other oplog-related fields.

3. **Incorrect configuration option name**: The post referenced `storage.oplogSizeMB` but the correct configuration option is `replication.oplogSizeMB`. The oplog size setting lives under the `replication:` YAML section, not `storage:`. Fixed the inline reference.

4. **`deleteMany` does not support a `limit` option**: The batch delete example used `db.events.deleteMany({ ... }, { limit: batchSize })`, but `deleteMany` does not accept a `limit` option. The `limit` would be silently ignored, causing all matching documents to be deleted in the first iteration — defeating the purpose of batching. Rewrote the example to first `find().limit(batchSize).toArray()` to get a batch of document IDs, then delete that specific batch with `deleteMany({ _id: { $in: ids } })`.

## Review Notes
- The `minRetentionHours` parameter shown in the Atlas section is correctly noted as a 4.4+ feature, though the post doesn't explicitly state the version requirement for it. This is acceptable since Atlas clusters generally run recent MongoDB versions.
- The oplog window calculation in Step 1 using `Timestamp.t` subtraction is correct and is a standard approach.
- The `opcounters` fields from `serverStatus` are cumulative since server start, not per-second rates. The post doesn't clarify this, but it's not technically wrong as presented.
