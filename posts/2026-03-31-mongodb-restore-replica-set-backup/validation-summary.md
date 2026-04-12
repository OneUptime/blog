# Validation Summary: How to Restore a Replica Set from Backup in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongod, mongosh)
- mongorestore / mongodump (MongoDB Database Tools)
- MongoDB Replica Sets
- Filesystem snapshots (LVM, EBS)
- systemctl (Linux service management)

## Sources Consulted
- MongoDB Manual: Restore a Replica Set from MongoDB Backups — https://www.mongodb.com/docs/manual/tutorial/restore-replica-set-from-backup/
- MongoDB Manual: mongorestore reference — https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Manual: mongorestore --oplogReplay and --oplogLimit — https://www.mongodb.com/docs/database-tools/mongorestore/#std-option-mongorestore.--oplogReplay
- MongoDB Manual: rs.initiate() — https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB Manual: rs.add() — https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB Manual: rs.status() — https://www.mongodb.com/docs/manual/reference/method/rs.status/

## Issues Found

1. **Critical: mongorestore called before mongod started (Method 1)**
   - **What was wrong:** Steps 2 and 3 were in the wrong order. Step 2 ran `mongorestore` after stopping mongod in Step 1, but `mongorestore` requires a running mongod instance to connect to. The server wasn't started until Step 3.
   - **What was changed:** Reorganized into Step 2 (clear data, comment out replication config, start mongod as standalone) and Step 3 (run mongorestore and verify data). Renumbered subsequent steps accordingly.
   - **Why:** `mongorestore` is a client tool that connects to a running mongod over the network. It cannot restore data to a stopped server.

2. **Method 2 missing standalone startup step**
   - **What was wrong:** Method 2 showed running `mongorestore --drop` on each member without mentioning that each member needs to be started as a standalone (with replication disabled) first.
   - **What was changed:** Added instructions to comment out replication config and start mongod as standalone on each member before restoring, and to re-enable replication afterward.
   - **Why:** Same as issue 1 — mongorestore requires a running mongod instance.

3. **Incorrect explanation for "not running with --replSet" error**
   - **What was wrong:** The explanation said the error occurs when "The replica set name in mongod.conf does not match the backup's config." This is inaccurate — the error means mongod was started without replication enabled at all (i.e., the replication config is missing or commented out).
   - **What was changed:** Corrected the explanation to state that the mongod instance was started without replication enabled, and to ensure the replication section is uncommented with the correct replSetName.
   - **Why:** A name mismatch would produce a different error. This specific error indicates replication is not configured.

## Review Notes
- The `--oplogReplay` option for mongorestore has been noted as deprecated in newer versions of MongoDB Database Tools (100.5.0+). The functionality still works but users should be aware it may be removed in future versions.
- The `--oplogLimit` timestamp format description (`<unix_timestamp>:<ordinal>`) is correct — it uses BSON Timestamp format where the first component is seconds since Unix epoch.
- The post uses `mongosh` which is the current MongoDB shell (replacing the legacy `mongo` shell), which is correct for modern MongoDB versions.
- All `rs.*` method names used (`rs.initiate`, `rs.add`, `rs.status`, `rs.printSecondaryReplicationInfo`) are current and non-deprecated.
