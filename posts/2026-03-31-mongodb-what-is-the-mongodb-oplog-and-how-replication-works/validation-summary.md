# Validation Summary: What Is the MongoDB Oplog and How Replication Works

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, oplog, replication)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Manual: Replica Set Oplog — https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB Manual: replSetResizeOplog command — https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB Manual: rs.printReplicationInfo() — https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/
- MongoDB Manual: rs.printSecondaryReplicationInfo() — https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB Manual: rs.status() — https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Manual: Replication — https://www.mongodb.com/docs/manual/replication/

## Issues Found
1. **Replication lag monitoring code assumed members[0] is the primary.** The `rs.status().members` array does not guarantee ordering by role; the primary can be at any index. The code also called `rs.status()` redundantly inside the loop. Fixed by storing the status in a variable and using `.find()` to locate the primary member.
2. **Replication lag subtraction was inverted.** The original code computed `secondaryOptimeDate - primaryOptimeDate`, which produces a negative value when the secondary is behind. Fixed to `primaryOptimeDate - secondaryOptimeDate` so lag is reported as a positive number.

## Review Notes
- The `h` (hash) field shown in the oplog entry example is always 0 in MongoDB 4.0+ and may be absent in MongoDB 5.0+. It is not incorrect for the example but is dated.
- The default oplog minimum size is technically 990 MB, not exactly 1 GB. The post's "min 1GB" is a reasonable approximation.
- The `wall` field (wall clock time), present in oplog entries since MongoDB 4.2+, is not shown in the example. This is acceptable since the example does not claim to be exhaustive.
