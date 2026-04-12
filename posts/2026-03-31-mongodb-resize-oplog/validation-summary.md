# Validation Summary: How to Resize the Oplog in MongoDB

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (3.6+ for `replSetResizeOplog`, 4.4+ for `minRetentionHours`)
- MongoDB Replica Sets
- mongosh (MongoDB Shell)
- mongod.conf (YAML configuration)

## Sources Consulted
- MongoDB official documentation: `replSetResizeOplog` command (https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/)
- MongoDB official documentation: Change the Size of the Oplog (https://www.mongodb.com/docs/manual/tutorial/change-oplog-size/)
- MongoDB official documentation: `rs.printReplicationInfo()` (https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/)
- MongoDB official documentation: `rs.printSecondaryReplicationInfo()` (https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/)
- MongoDB official documentation: Replica Set Oplog (https://www.mongodb.com/docs/manual/core/replica-set-oplog/)
- MongoDB official documentation: `mongod.conf` replication options (https://www.mongodb.com/docs/manual/reference/configuration-options/#replication-options)

## Issues Found
No technical issues found.

## Review Notes
- The post mentions "MongoDB 3.6+" for `replSetResizeOplog`, which is correct. The `minRetentionHours` parameter was introduced in MongoDB 4.4, but the post does not explicitly call out this version requirement. This is a minor omission that readers should be aware of.
- The bash examples use `mongosh` (the modern MongoDB shell), which is appropriate for current MongoDB versions (5.0+). For MongoDB 3.6-4.x servers, users would typically use the legacy `mongo` shell, though `mongosh` can also connect to older servers.
- The `db.oplog.rs.stats().maxSize` field returns bytes. The verification snippet correctly divides by `(1024 * 1024)` to convert to megabytes.
- The recommended order of operations (secondaries first, then primary) aligns with MongoDB best practices for administrative changes.
- The 24-72 hours oplog retention rule of thumb is consistent with MongoDB community and documentation recommendations.
