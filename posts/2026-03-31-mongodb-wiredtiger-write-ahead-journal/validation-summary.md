# Validation Summary: How to Understand the WiredTiger Write-Ahead Journal in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB
- WiredTiger storage engine
- WiredTiger write-ahead journal (WAL)
- MongoDB write concerns (`j: true`, `w: "majority"`)

## Sources Consulted
- MongoDB Manual: Journaling — https://www.mongodb.com/docs/manual/core/journaling/
- MongoDB Manual: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: db.serverStatus() — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Manual: Write Concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual: storage.journal.enabled — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.journal.enabled

## Issues Found

1. **Removed fabricated `WiredTigerPreplog` file from journal listing.** The file listing included `WiredTigerPreplog.0000000001`, which is not a real WiredTiger journal file type. WiredTiger journal files are named `WiredTigerLog.*` only. Removed the non-existent file from the example output.

2. **Removed outdated `db.serverStatus().dur` reference.** The post presented `db.serverStatus().dur` as a current option and `db.serverStatus().wiredTiger.log` as a "newer" alternative. In reality, `.dur` was specific to the MMAPv1 storage engine, which was removed in MongoDB 4.2. Since WiredTiger has been the default storage engine since MongoDB 3.2, the `.dur` field is not relevant. Removed the `.dur` reference and kept only the correct `.wiredTiger.log` path.

3. **Corrected "Disabling the Journal" section with version restrictions.** The original text stated journaling could be disabled "on replica set secondaries," which is incorrect for MongoDB 4.0+. Starting with MongoDB 4.0, journaling cannot be disabled on replica set members using WiredTiger. Starting with MongoDB 6.1, the `storage.journal.enabled` option was removed entirely and journaling is always enabled. Updated the section to accurately reflect these version-specific restrictions.

## Review Notes
- The default journal commit interval of 100 ms and the 100 MB journal file size are correct for WiredTiger.
- The `storage.journal.commitIntervalMs` configuration option is correct and accepts values between 1 and 500 ms.
- The WiredTiger log statistics field names (`"log bytes written"`, `"log sync operations"`, `"log flush operations"`, `"log sync_dir operations"`) are accurate.
- The write concern examples using `{ w: "majority", j: true }` are syntactically correct and represent best practices.
- The label `logWritesRequiringSync` for the `"log sync_dir operations"` metric is slightly misleading — `sync_dir` operations are directory-level fsync operations, not a count of writes requiring sync — but this is a minor naming choice that doesn't affect correctness of the code.
