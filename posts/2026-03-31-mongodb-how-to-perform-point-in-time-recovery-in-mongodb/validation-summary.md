# Validation Summary: How to Perform Point-in-Time Recovery in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (oplog, replica sets)
- mongodump / mongorestore (MongoDB Database Tools)
- mongosh (MongoDB Shell)
- Point-in-time recovery (PITR) concepts

## Sources Consulted
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB PITR guide: https://www.mongodb.com/docs/manual/tutorial/restore-replica-set-from-backup/
- MongoDB change streams documentation: https://www.mongodb.com/docs/manual/changeStreams/

## Issues Found

### 1. Incorrect Unix timestamps throughout the post
- **What was wrong:** All Unix timestamps (1743408000 and 1743411600) were incorrect. They corresponded to 2025-03-31 08:00:00 UTC and 2025-03-31 09:00:00 UTC respectively, but the comments claimed they represented 2026-03-31 10:00:00 UTC and 2026-03-31 11:00:00 UTC. Both the year (2025 vs 2026) and the hour (08:00/09:00 vs 10:00/11:00) were wrong.
- **What was changed:** Replaced all instances of 1743408000 with 1774951200 (correct value for 2026-03-31 10:00:00 UTC) and 1743411600 with 1774954800 (correct value for 2026-03-31 11:00:00 UTC). This affected the change stream example, oplog query, mongoexport/mongodump query, and both mongorestore --oplogLimit commands.

### 2. Incorrect use of mongoexport for oplog dump in Step 4
- **What was wrong:** The post used `mongoexport` to export oplog entries, which outputs JSON format. However, `mongorestore --oplogReplay` requires BSON format. The post mentioned "Convert to BSON and replay" as a comment but never showed the conversion, and the output path (`/tmp/oplog-recovery.json`) did not connect to the restore path (`/backup/oplog-replay/`).
- **What was changed:** Replaced `mongoexport` with `mongodump`, which outputs BSON directly. Added the necessary directory preparation step (`mkdir` + `mv`) to place the `oplog.rs.bson` file as `oplog.bson` at the dump root, which is the structure `mongorestore --oplogReplay` expects.

## Review Notes
- The `--oplog` flag for `mongodump` and `--oplogReplay` for `mongorestore` only work with replica set members. This is implied by the PITR context (which requires the oplog) but is not explicitly stated.
- `db.collection.stats()` is marked as deprecated in MongoDB 6.0+ in favor of the `$collStats` aggregation stage. The usage in the post still functions correctly but may warrant updating in the future.
- The change stream example for finding when a collection was dropped is valid but is a forward-looking approach (streams events from a start time). For retrospective investigation, querying the oplog directly (which is also shown) is more practical.
