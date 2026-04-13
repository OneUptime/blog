# Validation Summary: How to Handle MongoDB Disk Full Situations

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- Linux system administration (df, du, rsync)
- mongosh (MongoDB Shell)
- Bash scripting (disk monitoring)

## Sources Consulted
- MongoDB compact command documentation: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB dbStats documentation: https://www.mongodb.com/docs/manual/reference/command/dbStats/
- MongoDB WiredTiger storage engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB replica set maintenance mode documentation: https://www.mongodb.com/docs/manual/reference/command/replSetMaintenance/
- MongoDB fsync command documentation: https://www.mongodb.com/docs/manual/reference/command/fsync/
- MongoDB sharding balancer documentation: https://www.mongodb.com/docs/manual/reference/method/sh.stopBalancer/

## Issues Found
1. **Incorrect compact space requirement**: The post claimed `compact requires some free space to work (at least 2x the collection size)`. This is incorrect. MongoDB's WiredTiger compact rewrites data files in-place and requires only a modest amount of additional temporary disk space, not 2x the collection size. Fixed the comment to accurately state that compact requires some additional free disk space without the misleading 2x multiplier.

2. **Misleading compact locking description**: The post stated compact "requires collection-level lock". Since MongoDB 4.4+, compact yields to allow reads and writes intermittently and only briefly acquires an exclusive collection-level lock at the start and end of the operation. Fixed the comment to reflect this more accurately.

## Review Notes
- `db.collection.stats()` used in Options B and D is deprecated since MongoDB 6.2 in favor of `$collStats` aggregation stage, but it still functions correctly. A future update could migrate to the newer API.
- The monitoring script uses `df -h` which is fine, though `df --output=pcent` could be a cleaner alternative for parsing percentage values on systems that support it.
- The post does not specify which MongoDB versions it targets. The advice is generally applicable to MongoDB 4.4+ with WiredTiger.
