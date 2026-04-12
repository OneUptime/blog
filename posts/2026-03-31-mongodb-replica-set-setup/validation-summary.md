# Validation Summary: How to Set Up MongoDB Replica Set from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog-based replication, elections)
- mongosh (MongoDB Shell)
- mongod configuration files (YAML format)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Replica Set documentation: https://www.mongodb.com/docs/manual/replication/
- MongoDB rs.initiate() reference: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB rs.status() reference: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Replica Set Configuration reference: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- mongosh Read Preference documentation: https://www.mongodb.com/docs/mongodb-shell/reference/methods/#read-preference
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB mongod configuration file options: https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found

1. **`rs.secondaryOk()` is deprecated in mongosh.**
   - **What was wrong:** The post used `rs.secondaryOk()` to enable reads on a secondary in Step 6. This method is deprecated in `mongosh` (the modern MongoDB shell used throughout the post).
   - **What was changed:** Replaced `rs.secondaryOk()` with `db.getMongo().setReadPref("secondaryPreferred")`, which is the current recommended approach in `mongosh`.
   - **Why:** `rs.secondaryOk()` is a legacy helper carried over from the old `mongo` shell. The MongoDB documentation recommends `setReadPref()` for controlling read preferences in `mongosh`.

2. **`members[].slaveDelay` field name is deprecated.**
   - **What was wrong:** The Replica Set Configuration Options table listed `members[].slaveDelay` as the field for configuring replication delay on members.
   - **What was changed:** Replaced `slaveDelay` with `secondaryDelaySecs`, which is the current field name as of MongoDB 5.0.
   - **Why:** The `slaveDelay` field was renamed to `secondaryDelaySecs` in MongoDB 5.0 as part of the effort to use inclusive terminology. Since the post uses `mongosh` (which ships with MongoDB 5.0+), the current field name should be used.

## Review Notes
- The configuration file paths are described generically in Step 2 (e.g., `mongod1.conf`) but referenced as `/etc/mongod1.conf` in Step 3. This is not technically wrong but could be made clearer by specifying where to save the files.
- The `--fork` flag in Step 3 is only supported on Linux and macOS, not Windows. The post does not mention this limitation.
- The post correctly covers the essential setup workflow, configuration options, arbiter-based configuration, and best practices. All MongoDB commands, YAML configuration syntax, and the Node.js driver code are accurate.
- The mermaid diagram, rs.initiate() configuration, rs.status() output example, and connection string format are all correct.
