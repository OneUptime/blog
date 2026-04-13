# Validation Summary: How to Monitor MongoDB Replication Lag Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Replica Sets
- MongoDB Shell (mongosh / legacy mongo shell)
- rs.status() replica set status command
- rs.printReplicationInfo() and rs.printSecondaryReplicationInfo()
- mongostat CLI tool
- replSetResizeOplog admin command
- MongoDB oplog (local.oplog.rs)

## Sources Consulted
- MongoDB rs.status() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Replication Lag reference: https://www.mongodb.com/docs/manual/tutorial/troubleshoot-replica-sets/#replication-lag
- MongoDB BSON Timestamp type documentation: https://www.mongodb.com/docs/manual/reference/bson-types/#timestamps
- MongoDB replSetResizeOplog documentation: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB rs.printReplicationInfo() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/
- MongoDB rs.printSecondaryReplicationInfo() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- mongostat documentation: https://www.mongodb.com/docs/database-tools/mongostat/

## Issues Found
1. **Oplog window calculation used wrong property and divisor.** The code used `last.ts.getTime()` and `first.ts.getTime()` with a divisor of `3600000`. The oplog `ts` field is a BSON `Timestamp` type, not a `Date`. In mongosh, `Timestamp` does not have a `getTime()` method; the seconds-since-epoch component is accessed via `.t`. Additionally, since `.t` returns seconds (not milliseconds), the divisor must be `3600` (seconds per hour), not `3600000` (milliseconds per hour). Changed to `(last.ts.t - first.ts.t) / 3600`.

## Review Notes
- `rs.printReplicationInfo()` and `rs.printSecondaryReplicationInfo()` are deprecated starting in mongosh 2.1.0 (MongoDB 6.1+). The modern replacements are `db.getReplicationInfo()` and `db.printSecondaryReplicationInfo()` respectively. The deprecated methods still function, so this is not an error but worth noting for future updates.
- The first code example computes lag as `new Date() - member.optimeDate`, which measures time since the secondary last applied an op rather than the difference between primary and secondary optimes. If the primary is idle, this value grows even though the secondary is fully caught up. The second code example correctly compares `primary.optimeDate - secondary.optimeDate`, which is the more accurate measure of replication lag.
- The `use local` shell directive is mixed into a JavaScript code block. This works when typed interactively in mongosh but would not work if the entire block were executed as a script. This is a common convention in MongoDB tutorials and not strictly an error.
