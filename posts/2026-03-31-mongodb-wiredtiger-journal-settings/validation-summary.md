# Validation Summary: How to Configure MongoDB WiredTiger Journal Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger journaling and checkpointing
- Write concern and durability settings
- Journal compression (snappy, zlib, zstd)
- MongoDB profiler for write latency monitoring

## Sources Consulted
- MongoDB Manual: Configuration Options — `storage.journal.commitIntervalMs` (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.journal.commitIntervalMs)
- MongoDB Manual: Configuration Options — `storage.journal.enabled` (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.journal.enabled)
- MongoDB Manual: Configuration Options — `storage.wiredTiger.engineConfig.journalCompressor` (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.engineConfig.journalCompressor)
- MongoDB Manual: Journaling (https://www.mongodb.com/docs/manual/core/journaling/)
- MongoDB Manual: Write Concern (https://www.mongodb.com/docs/manual/reference/write-concern/)
- MongoDB Manual: serverStatus command (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB Manual: FAQ Storage (https://www.mongodb.com/docs/manual/faq/storage/)

## Issues Found

1. **`serverStatus.dur` is MMAPv1-only (line 109):** The post used `db.adminCommand({ serverStatus: 1 }).dur` to "check durability." The `.dur` field only exists for the legacy MMAPv1 storage engine and returns `undefined` on WiredTiger instances (the default since MongoDB 3.2, and the only engine since MongoDB 4.2). Replaced with a WiredTiger-specific journal stat under `.wiredTiger.log`.

2. **Misleading replica set data loss statement (line 80):** The original text stated "the primary waits for secondaries to acknowledge" as a general replica set behavior. This is only true with `w: "majority"` write concern. With `w: 1`, the primary does not wait for secondaries at all, and data loss is still bounded by `commitIntervalMs`. Rewrote to clarify the distinction between `w: 1` and `w: "majority"` behavior.

3. **Incomplete journal compressor options list (line 52):** The inline comment listed options as "none, snappy, zlib" but omitted `zstd`, which has been available since MongoDB 4.2. The expanded section later in the post correctly listed all four options. Fixed the inline comment to include `zstd`.

4. **`w:majority` implies `j:true` version attribution (line 123):** The comment stated this behavior started in "MongoDB 5.0+". In reality, `w: "majority"` has implied `j: true` via the `writeConcernMajorityJournalDefault` replica set configuration since MongoDB 3.6. What changed in 5.0 was that the default write concern became `w: "majority"`. Fixed the comment to reference 3.6+ and the `writeConcernMajorityJournalDefault` setting.

5. **`storage.journal.enabled` removed in MongoDB 6.1 (lines 131-139):** The post showed disabling journaling without noting that this option was removed in MongoDB 6.1, where journaling is always enabled. Added a version caveat noting the removal.

## Review Notes
- The WiredTiger log stat field names used in the "Checking Journal Status at Runtime" section (e.g., `"log files in use"`, `"log bytes written to disk"`) may not match exact field names in all MongoDB versions. The stat field names can vary between releases. The general approach of querying `serverStatus.wiredTiger.log` is correct.
- The `WiredTigerPreplog` file shown in the journal directory listing is valid — these files are used for prepared transactions (multi-document transactions) introduced in MongoDB 4.2, though they may not be present on all installations.
- The post correctly identifies the default checkpoint interval (60 seconds), default journal file size (~100 MB), and the valid `commitIntervalMs` range (1-500ms, default 100ms).
