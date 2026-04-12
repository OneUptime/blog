# Validation Summary: How to Use db.printSecondaryReplicationInfo() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, replication)
- mongosh (MongoDB Shell)
- MongoDB oplog
- `db.printSecondaryReplicationInfo()` / `rs.printSecondaryReplicationInfo()`
- `rs.status()` for programmatic replication monitoring
- `rs.conf()` / `rs.reconfig()` for replica set configuration

## Sources Consulted
- MongoDB official documentation: `db.printSecondaryReplicationInfo()` shell method (https://www.mongodb.com/docs/manual/reference/method/db.printSecondaryReplicationInfo/)
- MongoDB official documentation: `rs.printSecondaryReplicationInfo()` shell method (https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/)
- MongoDB official documentation: `rs.status()` (https://www.mongodb.com/docs/manual/reference/method/rs.status/)
- MongoDB official documentation: Replica Set Replication Lag (https://www.mongodb.com/docs/manual/tutorial/troubleshoot-replica-sets/#replication-lag)
- MongoDB official documentation: Replica Set Configuration (https://www.mongodb.com/docs/manual/reference/replica-configuration/)
- MongoDB official documentation: Change the Size of the Oplog (https://www.mongodb.com/docs/manual/tutorial/change-oplog-size/)

## Issues Found
No technical issues found.

## Review Notes
- The comment "Preferred alias in newer shell versions" for `rs.printSecondaryReplicationInfo()` is slightly misleading — both `db.` and `rs.` forms are equivalent with no official preference. However, this is a stylistic observation, not a technical error.
- The claim that "long-running queries on the secondary can delay oplog application if they hold locks" is more applicable to older MongoDB versions using MMAPv1. With WiredTiger (default since MongoDB 3.2), reads generally don't block oplog application due to MVCC. Heavy reads can still impact replication through resource contention (CPU, memory, I/O), so the broader point remains valid even if the lock-specific mechanism is less relevant in modern deployments.
- The `oplogSizeMB` advice focuses on the primary, which is correct since the primary's oplog is what secondaries replicate from. In practice, it is recommended to keep oplog size consistent across all members, but the post's advice is not wrong.
