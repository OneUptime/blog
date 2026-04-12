# Validation Summary: How to Recover MongoDB from Corrupted Data

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongod CLI (--repair flag)
- mongodump / mongorestore (MongoDB Database Tools)
- WiredTiger command-line tool (wt)
- Replica set initial sync
- YAML configuration for mongod

## Sources Consulted
- MongoDB mongod CLI reference: https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB validate command reference: https://www.mongodb.com/docs/manual/reference/command/validate/
- MongoDB replSetGetStatus reference: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB mongorestore reference: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB recovery tutorial: https://www.mongodb.com/docs/manual/tutorial/recover-data-following-unexpected-shutdown/
- WiredTiger command-line utility documentation: https://source.wiredtiger.com/develop/command_line.html
- WiredTiger metadata architecture: https://source.wiredtiger.com/develop/arch-metadata.html

## Issues Found

1. **`mongod --validate` does not validate data files (line 50-53):** The `--validate` flag for mongod validates configuration file and command-line option syntax, not data file integrity. Replaced with a `mongosh` command to check `db.serverStatus().wiredTiger` for storage engine issues.

2. **`wt verify` missing `table:` URI prefix (line 86):** The WiredTiger `wt` command-line tool requires a URI with a `table:` prefix for the `verify` command. Changed `verify collection-0-12345678` to `verify table:collection-0-12345678`.

3. **`cat WiredTiger.wt` presented as reading an error log (line 89-94):** `WiredTiger.wt` is a binary btree metadata table file, not a text log. Using `cat` on it produces binary garbage. Replaced with `wt -h /path list -v` to properly read WiredTiger metadata, and corrected the section heading from "Check WiredTiger error log" to "List WiredTiger metadata and diagnostic files."

4. **Second `mongorestore --oplogReplay` for PITR was incorrect (lines 163-167):** The blog showed pointing `mongorestore --oplogReplay` at a separate directory of oplog entries for point-in-time recovery, which is not how the tool works. Replaced with the correct approach using `--oplogReplay` with `--oplogLimit` to stop replay at a specific timestamp.

## Review Notes
- The `db.collection.validate()` output field `errors` is described as an array. In older MongoDB versions (pre-6.0) it was a string; in newer versions it is an array. The code using `printjson(result.errors)` works in either case, so no change was made.
- The `replSetGetStatus.initialSyncStatus` field is only present during active initial sync (STARTUP2 state). The blog doesn't explicitly note this, but the context makes it clear the member is syncing.
- The blog uses example credentials (`admin:password`) in connection URIs. While fine for a tutorial, production users should use environment variables or config files for credentials.
