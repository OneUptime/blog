# Validation Summary: How to Configure Journaling in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB journaling / write-ahead log (WAL)
- MongoDB write concerns
- mongod.conf configuration
- WiredTiger journal compressors (snappy, zlib, zstd)

## Sources Consulted
- MongoDB Manual — Journaling: https://www.mongodb.com/docs/manual/core/journaling/
- MongoDB Manual — Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual — serverStatus command: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Manual — Write Concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual — mongod reference: https://www.mongodb.com/docs/manual/reference/program/mongod/

## Issues Found

1. **Incorrect journal status command (`.dur` is MMAPv1-only):** The post used `db.adminCommand({ serverStatus: 1 }).dur` to check journal status. The `.dur` field was specific to the MMAPv1 storage engine, which was removed in MongoDB 4.2. Changed to `db.serverStatus().wiredTiger.log`, which is the correct path for WiredTiger journal statistics.

2. **Missing MongoDB 6.1+ journaling restriction:** The section on disabling journaling only mentioned standalone vs. replica set behavior. Starting in MongoDB 6.1, the `storage.journal.enabled` option was removed entirely and journaling cannot be disabled at all. Added a note about this.

3. **Incomplete checkpoint interval description:** The post stated WiredTiger checkpoints every 60 seconds but omitted the alternative trigger of 2 GB of journal data written. Updated to include both conditions.

4. **Outdated MMAPv1 reference:** The introductory text referenced MMAPv1 as if it were a current alternative. Updated to note WiredTiger has been the default since MongoDB 3.2, removing the implication that MMAPv1 is still relevant.

5. **Misleading introductory text for WiredTiger journal settings:** The section said "You can tune the log buffer size" but the example showed configuring the journal compressor, not the buffer size. Fixed the text to match the example.

## Review Notes
- The `commitIntervalMs` setting (default 100ms, range 1-500ms) is confirmed accurate for MongoDB versions prior to 6.1. In MongoDB 6.1+, some journal-related configuration options were removed; users on modern versions should consult the latest documentation.
- The WiredTiger log stat field names used in the monitoring section ("log bytes written", "log sync operations", "log flush operations") are commonly referenced but the exact field name "log flush operations" could not be independently confirmed from official docs alone. Users should run `db.serverStatus().wiredTiger.log` to see available fields on their version.
