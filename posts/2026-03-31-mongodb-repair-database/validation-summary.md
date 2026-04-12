# Validation Summary: How to Repair a MongoDB Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod, mongod --repair)
- WiredTiger storage engine
- MongoDB Replica Sets
- Linux systemd service management

## Sources Consulted
- [MongoDB Manual - Recover a Standalone after Unexpected Shutdown](https://www.mongodb.com/docs/manual/tutorial/recover-data-following-unexpected-shutdown/)
- [MongoDB Manual - mongod reference](https://www.mongodb.com/docs/manual/reference/program/mongod/)
- [MongoDB Manual - db.collection.reIndex()](https://www.mongodb.com/docs/manual/reference/method/db.collection.reindex/)
- [MongoDB 4.2 Release Notes - Compatibility Changes (MMAPv1 removal)](https://www.mongodb.com/docs/manual/release-notes/4.2-compatibility/)
- [WiredTiger Error Handling Documentation - salvage=true](https://source.wiredtiger.com/develop/error_handling.html)
- [MongoDB JIRA DOCS-9923 - storage.repairPath only applies to MMAPv1](https://jira.mongodb.org/browse/DOCS-9923)

## Issues Found

### 1. `--repairpath` option no longer exists (Severity: High)
**What was wrong:** The post included a section "Repair with a Different Repair Path" showing `mongod --repair --repairpath /tmp/mongodb-repair`. The `--repairpath` option was removed in MongoDB 4.2 along with the MMAPv1 storage engine. It does not exist in any currently supported MongoDB version.
**What was changed:** Replaced the section with guidance on copying the data directory to a larger volume and running repair there, which is the correct approach for modern MongoDB.

### 2. `reIndex()` is deprecated (Severity: Medium)
**What was wrong:** The post recommended `db.orders.reIndex()` to rebuild indexes after repair, claiming "Repair may not rebuild all indexes." Both claims are incorrect: `reIndex()` was deprecated in MongoDB 6.0 (and restricted to standalone instances since 5.0), and `mongod --repair` has automatically rebuilt all indexes since MongoDB 4.0.3.
**What was changed:** Replaced the section to explain that `--repair` rebuilds indexes automatically, and showed the drop/recreate approach as a fallback for suspected corrupt indexes.

### 3. WiredTiger `salvage=true` framing was misleading (Severity: Low)
**What was wrong:** The post presented `--wiredTigerEngineConfigString "salvage=true"` as a standard, less-destructive alternative to `--repair`. While `salvage=true` is a valid WiredTiger-level configuration, it is not documented in MongoDB's official documentation and bypasses MongoDB's controlled repair workflow.
**What was changed:** Reframed the section to clarify that `--repair` is the primary recommended approach which internally uses WiredTiger's salvage, and noted that passing `salvage=true` directly is an advanced, undocumented technique.

## Review Notes
- The post does not specify which MongoDB versions it targets. All fixes align with MongoDB 4.2+ (the oldest version where WiredTiger is the only storage engine). The guidance is correct for MongoDB 5.0 through 8.0.
- The replica set section correctly advises removing a member before repairing and resyncing afterward. This is sound advice.
- The `validate` command usage is correct and follows current MongoDB documentation.
