# Validation Summary: How to Handle Replica Set Failover in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, elections, failover)
- MongoDB Node.js Driver (MongoClient, SDAM events, retryable writes)
- mongosh (shell commands: rs.stepDown, rs.freeze, rs.conf, rs.reconfig)

## Sources Consulted
- MongoDB Manual — Retryable Writes: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Manual — hello command: https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB Manual — Replica Set Configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual — Replica Set Elections: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB Manual — Error Codes: https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB Node.js Driver — Cluster Monitoring: https://www.mongodb.com/docs/drivers/node/current/fundamentals/monitoring/cluster-monitoring/
- MongoDB Retryable Writes Specification: https://github.com/mongodb/specifications/blob/master/source/retryable-writes/retryable-writes.md

## Issues Found

### 1. Deprecated `isMaster` command (Section: "Checking Who is Primary")
**What was wrong:** The post used `rs.isMaster()` and `db.runCommand({ isMaster: 1 })`, which have been deprecated since MongoDB 5.0. The output field `ismaster` is also deprecated.
**What was changed:** Updated to `rs.hello()` and `db.runCommand({ hello: 1 })`. Changed the output field from `"ismaster"` to `"isWritablePrimary"`.
**Why:** The `hello` command is the official replacement since MongoDB 5.0. The old commands still work as aliases but should not be recommended in new content.

### 2. Incorrect SDAM event name and internal API usage (Section: "Monitoring Failover Events")
**What was wrong:** The code used the event name `topologyChanged` (which does not exist) and accessed `client.topology` (an internal, non-public API) to listen for events. Additionally, `commandFailed` event monitoring was used without `monitorCommands: true`.
**What was changed:** Fixed the event name to `topologyDescriptionChanged`. Changed event listening to use `client.on()` directly instead of `client.topology.on()`. Added `monitorCommands: true` to the MongoClient options.
**Why:** The correct SDAM event name in the Node.js driver is `topologyDescriptionChanged`. SDAM events should be listened to on the MongoClient instance directly. Command monitoring events (`commandFailed`, `commandStarted`, `commandSucceeded`) require `monitorCommands: true` to be enabled.

### 3. Inaccurate retryable bulk writes description (Section: "Retryable Writes")
**What was wrong:** The post stated bulk writes are retryable "if `ordered: true`" and listed "multi-document updates without sessions" as non-retryable.
**What was changed:** Updated to state bulk writes are retryable "only if all operations are single-document writes". Updated the non-retryable list to explicitly name `updateMany`, `deleteMany`, and bulk writes containing multi-document operations.
**Why:** The retryability of bulk writes depends on whether all contained operations are single-document writes (insertOne, updateOne, replaceOne, deleteOne), not on the `ordered` flag. A bulk write containing `updateMany` or `deleteMany` is not retryable regardless of ordering.

## Review Notes
- Error code 10107 is commented as `NotPrimary` in the retry code. The official name was renamed from `NotMaster` to `NotWritablePrimary` in MongoDB 5.0. The comment conveys the correct meaning and the error code number is accurate, so no change was made.
- The `socketTimeoutMS` option is present in the driver options example. While still functional, some recent MongoDB driver documentation de-emphasizes socket timeouts in favor of operation-level timeouts (`timeoutMS` introduced in driver 6.x). This is not incorrect but worth noting for future updates.
- The `heartbeatFrequencyMS` is set to 10000 (10s) in the example, which matches the default. During failover, the driver uses an accelerated heartbeat interval (500ms) to detect topology changes faster, so the configured value mainly affects steady-state monitoring.
