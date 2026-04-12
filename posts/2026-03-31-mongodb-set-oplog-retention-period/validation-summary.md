# Validation Summary: How to Set Minimum Oplog Retention Periods in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (4.4+)
- Oplog (operations log)
- Replica Set replication
- WiredTiger storage engine
- `replSetResizeOplog` command
- `mongod.conf` configuration

## Sources Consulted
- MongoDB replSetResizeOplog command reference: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB Replica Set Oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB configuration options (storage section): https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB mongod command-line reference: https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB Change Oplog Size tutorial: https://www.mongodb.com/docs/manual/tutorial/change-oplog-size/
- MongoDB db.getReplicationInfo() reference: https://www.mongodb.com/docs/manual/reference/method/db.getReplicationInfo/
- MongoDB WiredTiger storage engine docs: https://www.mongodb.com/docs/manual/core/wiredtiger/

## Issues Found

### 1. Incorrect config file section for `oplogMinRetentionHours`
- **What was wrong:** The `mongod.conf` example placed `oplogMinRetentionHours` under the `replication:` section.
- **What was changed:** Moved it under the `storage:` section. The correct config path is `storage.oplogMinRetentionHours`, not `replication.oplogMinRetentionHours`. Note: `oplogSizeMB` correctly stays under `replication:`.
- **Why:** The MongoDB documentation specifies this as a storage option, not a replication option.

### 2. Misleading use of `replSetGetConfig` for verifying oplog settings
- **What was wrong:** The "Verifying the Configuration" section used `db.adminCommand({ replSetGetConfig: 1 }).config` and suggested looking for oplog size/retention there. `replSetGetConfig` returns replica set member configuration (priorities, votes, etc.), not oplog size or retention settings.
- **What was changed:** Removed the `replSetGetConfig` command and its misleading comment, keeping only the correct `db.oplog.rs.stats().maxSize` approach for checking oplog size.
- **Why:** `replSetGetConfig` does not contain oplog size or retention information and would confuse readers.

### 3. Invalid filesystem command for monitoring oplog disk usage
- **What was wrong:** The post suggested `du -sh /var/lib/mongodb/local.oplog.rs.*` to monitor oplog disk usage. WiredTiger (MongoDB's default storage engine) does not store collections as files named after the collection — it uses opaque filenames like `collection-<N>.wt`.
- **What was changed:** Replaced the `du` shell command with a mongo shell command using `db.oplog.rs.stats().storageSize` to check actual oplog disk usage.
- **Why:** The original command would match no files and return nothing useful on any standard MongoDB installation using WiredTiger.

## Review Notes
- The `getParameter` approach for checking `oplogMinRetentionHours` (line 74 in original) works but the MongoDB documentation recommends `db.serverStatus().oplogTruncation.oplogMinRetentionHours` as the preferred method. Left as-is since `getParameter` is still valid.
- The recommended retention values table is reasonable guidance but is not sourced from official MongoDB documentation — these are the author's recommendations. This is acceptable for a blog post.
- The claim that MongoDB "grows the oplog storage if necessary" when retention is active is correct — the docs confirm the oplog can grow without constraint to honor the retention period.
