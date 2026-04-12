# Validation Summary: How to Perform MongoDB Point-in-Time Recovery with Oplogs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog)
- mongodump / mongorestore (MongoDB Database Tools)
- BSON Timestamps
- mongosh (MongoDB Shell)
- Bash scripting (backup automation)

## Sources Consulted
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB BSON Types reference (Timestamps): https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB replSetResizeOplog command reference: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB Node.js driver Timestamp class API: https://mongodb.github.io/node-mongodb-native/6.12/classes/BSON.Timestamp.html
- mongo-tools source code (oplog.go): https://github.com/mongodb/mongo-tools

## Issues Found
1. **`getHighBits()` used instead of `.t` on BSON Timestamps** (3 occurrences: Steps 2, 4, and Estimating Oplog Window section). The post used `d.ts.getHighBits()` to extract the seconds portion of oplog Timestamp values. `getHighBits()` is an inherited method from the internal `Long` class, not the documented Timestamp API. The correct and documented way to access the seconds and increment parts of a BSON Timestamp is via the `.t` and `.i` properties respectively. Changed all three occurrences to use `.t`.

2. **Missing `mkdir -p` in Step 6**. The command `cp /backup/oplog-dump/local/oplog.rs.bson /backup/oplog-for-replay/oplog.bson` would fail if `/backup/oplog-for-replay/` does not exist. Added `mkdir -p /backup/oplog-for-replay` before the copy command.

## Review Notes
- The `replSetResizeOplog` command works as shown, but MongoDB documentation recommends wrapping the `size` value in `Double()` (e.g., `size: Double(10240)`) in mongosh to ensure correct type handling. This is a minor best-practice suggestion, not an error.
- The `--oplog` flag for mongodump requires the source to be a member of a replica set. The post mentions replica sets in Step 3 but does not explicitly state this prerequisite for the `--oplog` flag. Readers running a standalone instance may be confused.
- The overall recovery workflow (dump with `--oplog`, separately dump the oplog, restore base, replay oplog with `--oplogLimit`) is technically sound and follows MongoDB best practices.
