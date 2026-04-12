# Validation Summary: How to Respond to MongoDB Election Events

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MongoDB (replica sets, elections, oplog)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver (`mongodb` package)
- PyMongo (Python MongoDB driver)
- MongoDB Atlas

## Sources Consulted
- MongoDB Replica Set Elections documentation: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB Replica Set Member States: https://www.mongodb.com/docs/manual/reference/replica-states/
- MongoDB Replica Set Configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB rs.reconfig() reference: https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB Retryable Writes: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB error_codes.yml (error code 10107 = NotWritablePrimary): https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.yml
- MongoDB SDAM Specification (heartbeatFrequencyMS): https://github.com/mongodb/specifications/blob/master/source/server-discovery-and-monitoring/server-monitoring.md
- Node.js MongoDB Driver Connection Options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/

## Issues Found

1. **Election timing overstated**: The post claimed elections "typically complete in 10-30 seconds." MongoDB documentation states the median time before a cluster elects a new primary should not typically exceed 12 seconds with default settings. Changed to "under 12 seconds (median)."

2. **Non-existent `ELECTING` state**: The post advised watching for members in `ELECTING` state. This is not a valid MongoDB replica set member state. Valid states are: STARTUP, PRIMARY, SECONDARY, RECOVERING, STARTUP2, UNKNOWN, ARBITER, DOWN, ROLLBACK, and REMOVED. During an election, members remain in their current state (typically SECONDARY). Changed to advise watching for the absence of any PRIMARY member instead.

3. **`rs.reconfig()` settings overwrite bug**: The post used `{...rs.conf(), settings: { electionTimeoutMillis: 10000, heartbeatTimeoutSecs: 10 }}` which would completely overwrite the existing `settings` object, losing fields like `chainingAllowed`, `getLastErrorDefaults`, `heartbeatIntervalMillis`, `catchUpTimeoutMillis`, etc. Replaced with the correct pattern: fetch the config into a variable, modify individual settings fields, then pass the full config to `rs.reconfig()`. Also changed the values from their defaults (10000/10) to actually-increased values (15000/15), since the comment says "Increase election timeout" but the original code was setting them to their default values, which wouldn't change anything.

## Review Notes
- The `retryWrites: true` comment says "default true in MongoDB driver 4.x+" which is roughly correct but imprecise. It became the default in drivers compatible with MongoDB server 4.2+, not specifically driver version 4.x. Left as-is since it's close enough and not misleading for the target audience.
- `heartbeatFrequencyMS: 2000` in both Node.js and PyMongo examples is valid (minimum is 500ms per the SDAM spec) but aggressive compared to the 10000ms default. This will increase monitoring traffic. The post could note this trade-off but it's not incorrect.
- `heartbeatTimeoutSecs` is primarily relevant to the legacy replication protocol version 0 (pv0). In modern MongoDB (3.2+ using pv1), `electionTimeoutMillis` is the primary mechanism. The setting is still valid but less impactful than it was historically.
