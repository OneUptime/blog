# Validation Summary: How to Configure MongoDB for Disaster Recovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (replica sets, delayed secondaries, replication)
- mongodump (backup utility)
- mongosh (MongoDB Shell)
- AWS S3 (for off-site backup storage)

## Sources Consulted
- MongoDB Replica Set Configuration reference: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB rs.reconfig() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB Delayed Replica Set Members: https://www.mongodb.com/docs/manual/core/replica-set-delayed-member/
- MongoDB mongodump --oplog documentation: https://www.mongodb.com/docs/database-tools/mongodump/#std-option-mongodump.--oplog
- MongoDB rs.stepDown() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB db.hello() documentation (replacement for deprecated isMaster): https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB rs.printSecondaryReplicationInfo(): https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/

## Issues Found
- **Deprecated `rs.isMaster()` call**: The post used `rs.isMaster().primary` to verify the new primary after a step-down. `rs.isMaster()` has been deprecated since MongoDB 5.0 in favor of `db.hello()`. Changed to `db.hello().primary`.

## Review Notes
- The `secondaryDelaySecs` field is the correct name for MongoDB 5.0+. Prior to 5.0, this was called `slaveDelay`. The post implicitly targets MongoDB 5.0+ which is appropriate.
- The `mongodump --oplog` flag only works when connected to a replica set member. The example URI `mongodb://localhost:27017` is fine in the context of the post since it assumes a replica set deployment, but readers should be aware this won't work against a standalone instance.
- The `rs.reconfig()` example passes a full configuration object directly. In practice, it's common to retrieve the current config with `rs.conf()`, modify it, and pass it back. The approach shown works but omits the version field, which MongoDB auto-increments in modern versions.
