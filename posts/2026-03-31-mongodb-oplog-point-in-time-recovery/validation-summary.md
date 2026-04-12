# Validation Summary: How to Use the Oplog for Point-in-Time Recovery in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica set oplog)
- mongodump / mongorestore (MongoDB Database Tools)
- mongosh (MongoDB Shell)
- MongoDB Atlas Continuous Cloud Backup (PITR)

## Sources Consulted
- mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- db.collection.findOne() reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/
- Replica Set Oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- Atlas Point-in-Time Recovery: https://www.mongodb.com/docs/atlas/recover-pit-continuous-cloud-backup/
- cursor.sort() / $natural: https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
- Back Up and Restore with MongoDB Tools: https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/

## Issues Found
1. **Misleading oplog description (line 20):** The post stated the oplog "records every write operation since the primary started (within the oplog window)." The oplog is a capped collection — old entries are overwritten when the size limit is reached, and it persists across restarts. Saying "since the primary started" is incorrect. Changed to: "The oplog is a capped collection that keeps a rolling record of every write operation within the oplog window."

2. **Incorrect `findOne` syntax (line 99):** `db.orders.findOne({}, { sort: { createdAt: -1 } })` passes the sort option as the second argument, which mongosh interprets as a projection, not options. The second parameter of `findOne()` is the projection document. Changed to `db.orders.find().sort({ createdAt: -1 }).limit(1)` which is the correct way to retrieve the most recent document.

## Review Notes
- The Atlas PITR granularity of "1 second" is accurate when using the oplog timestamp restore method. The calendar-based Date & Time UI option has 1-minute granularity. The post's claim is acceptable as-is but could be more precise.
- The `mongodump --oplog` flag only works against replica set members (not standalone or mongos instances) and requires a full dump (no `--db` or `--collection` filtering). The post does not mention this constraint explicitly, though the example URI includes `replicaSet=rs0` which implies the correct setup.
- The `--oplogLimit` flag was deprecated in MongoDB Database Tools 100.0.0+ in favor of `--oplogLimit` with Timestamp type. The format shown (`seconds:ordinal`) is still accepted by current tools.
