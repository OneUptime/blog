# Validation Summary: How to Fix MongoServerError: Not Primary in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (replica sets, elections, topology)
- MongoDB Node.js driver (`mongodb` npm package)
- MongoDB shell commands (`rs.status()`, `hello`)

## Sources Consulted
- MongoDB official docs: Read Preference (https://www.mongodb.com/docs/manual/core/read-preference/)
- MongoDB official docs: Write Concern (https://www.mongodb.com/docs/manual/reference/write-concern/)
- MongoDB official docs: hello command (https://www.mongodb.com/docs/manual/reference/command/hello/)
- MongoDB official docs: Connection String URI Format (https://www.mongodb.com/docs/manual/reference/connection-string/)
- MongoDB official docs: Replica Set Elections (https://www.mongodb.com/docs/manual/core/replica-set-elections/)
- MongoDB Node.js Driver documentation (https://www.mongodb.com/docs/drivers/node/current/)

## Issues Found

1. **Incorrect claim about `readPreference: "secondary"` causing write failures**: The original bullet point stated that using `readPreference: "secondary"` on a connection that also issues writes is a cause of the "not primary" error. This is technically incorrect -- the MongoDB driver always routes writes to the primary regardless of the readPreference setting. readPreference only affects read operations. Changed the bullet to describe `directConnection: true`, which actually does bypass topology discovery and can cause writes to hit a secondary.

2. **Misleading section title "Configuring Write Concern to Route Correctly"**: Write concern (`w: "majority"`) controls acknowledgment behavior (how many replicas must confirm a write), not write routing. Routing is handled by the driver's topology management based on the replica set URI. Renamed the section to "Configuring the Connection Correctly".

3. **Deprecated `isMaster` command**: The `isMaster` command was deprecated in MongoDB 5.0 and replaced by the `hello` command. Updated the code example from `adminDb.command({ isMaster: 1 })` / `isMaster.ismaster` to `adminDb.command({ hello: 1 })` / `hello.isWritablePrimary`, which is the modern equivalent.

## Review Notes
- The retry logic code uses `err.codeName === "NotWritablePrimary"`, which is correct for MongoDB 5.0+. In older versions (pre-5.0), the codeName was `"NotMaster"`. The post targets modern MongoDB, so this is acceptable.
- Modern MongoDB drivers (4.2+) support retryable writes via `retryWrites=true` in the connection string, which handles transient "not primary" errors automatically. The manual retry pattern shown is valid but readers should also be aware of the built-in retry mechanism.
- The `rs.status()` examples use `print()` which works in both the legacy `mongo` shell and the modern `mongosh`.
