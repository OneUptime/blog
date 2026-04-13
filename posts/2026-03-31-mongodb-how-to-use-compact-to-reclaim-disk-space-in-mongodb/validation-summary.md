# Validation Summary: How to Use Compact to Reclaim Disk Space in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (compact command, WiredTiger storage engine)
- mongosh (MongoDB Shell)
- mongod (--repair startup option)

## Sources Consulted
- [MongoDB compact command documentation (current)](https://www.mongodb.com/docs/manual/reference/command/compact/)
- [MongoDB compact command documentation (v4.4)](https://www.mongodb.com/docs/v4.4/reference/command/compact/)
- [MongoDB compact docs source on GitHub](https://github.com/mongodb/docs/blob/master/source/reference/command/compact.txt)
- [MongoDB 4.2 Compatibility Changes (repairDatabase removal)](https://www.mongodb.com/docs/rapid/release-notes/4.2-compatibility/)
- [mongosh Compatibility Changes (rs.secondaryOk deprecation)](https://www.mongodb.com/docs/mongodb-shell/reference/compatibility/)

## Issues Found

1. **`freeSpaceTargetMB` version incorrect**: The post stated this option was available in "MongoDB 4.4+". It was actually introduced in MongoDB 7.3. Fixed the section heading and version reference, and added note about the 20 MB default value.

2. **Compact blocking behavior incorrect for MongoDB 4.4+**: The WiredTiger behavior section stated "Blocks the collection during compaction (read/write blocked)". Starting in MongoDB 4.4, compact does not block CRUD operations — it only blocks metadata operations like `drop` and `createIndex`. Updated to reflect the correct 4.4+ behavior.

3. **`repairDatabase` was removed in MongoDB 4.2**: The post recommended `db.adminCommand({ repairDatabase: 1 })` without noting it was removed. The `repairDatabase` command was removed in MongoDB 4.2. Replaced the entire section with the correct alternative: `mongod --repair` startup option for standalone instances.

4. **`const db = db.getSiblingDB("mydb")` causes ReferenceError**: In the automation script, `const db` shadows the global `db` variable. Due to JavaScript's temporal dead zone, the right-hand side `db.getSiblingDB(...)` tries to access `db` before the `const` declaration is complete, throwing a ReferenceError. Fixed by renaming the variable to `mydb` and updating all references in the script.

## Review Notes
- `rs.secondaryOk()` in the replica set section is deprecated in mongosh (replaced by `db.getMongo().setReadPref("secondaryPreferred")`), but still works as an alias. Not changed since it remains functional, but could be updated in a future revision.
- The `bytesFreed` field in the compact response is documented in current MongoDB docs but was not explicitly documented in older versions. The field is used correctly in the post.
- The `freeStorageSize` field in `collStats` output (used in the "Estimating Space to Reclaim" section) is correct and available in MongoDB 4.4+.
