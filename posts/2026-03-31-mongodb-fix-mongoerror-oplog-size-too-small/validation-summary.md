# Validation Summary: How to Fix MongoError: Oplog Size Is Too Small in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog, replication)
- mongosh (MongoDB Shell)
- mongod configuration

## Sources Consulted
- MongoDB documentation on the oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB documentation on `replSetResizeOplog`: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB documentation on `rs.printSecondaryReplicationInfo()`: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB documentation on `db.getReplicationInfo()`: https://www.mongodb.com/docs/manual/reference/method/db.getReplicationInfo/
- MongoDB documentation on `replication.oplogSizeMB` configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-replication.oplogSizeMB

## Issues Found
1. **Deprecated method `rs.printSlaveReplicationInfo()`** (line 52): This method was deprecated in MongoDB 4.2 and replaced by `rs.printSecondaryReplicationInfo()`. Updated to use the current method name.
2. **Incorrect math in oplog size calculation** (line 101): The comment stated `1000 ops/sec * 3600 * 72 hours * 200 bytes = ~518 GB`. The actual result is `1000 * 3600 * 72 * 200 = 51,840,000,000 bytes ≈ 48 GB`. The original was off by approximately 10x. Corrected to `~48 GB`.

## Review Notes
- The `replSetResizeOplog` command requires the WiredTiger storage engine, which is the default since MongoDB 3.2. The post could mention this constraint for completeness, but it is unlikely to affect most readers.
- The `--oplogSize` command-line flag is correct but MongoDB documentation recommends using configuration files over command-line options for production deployments.
- The post correctly notes that `replSetResizeOplog` must be run on each replica set member individually.
