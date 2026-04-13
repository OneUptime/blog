# Validation Summary: How to Monitor MongoDB with currentOp Command

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (currentOp command, killOp command)
- mongosh (MongoDB Shell)

## Sources Consulted
- [db.currentOp() — MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.currentOp/)
- [currentOp (database command) — MongoDB Manual](https://www.mongodb.com/docs/manual/reference/command/currentOp/)
- [db.killOp() — MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.killOp/)
- [$currentOp (aggregation stage) — MongoDB Manual](https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/)
- [sleep() — mongosh Native Methods](https://www.mongodb.com/docs/manual/reference/method/sleep/)

## Issues Found

1. **`op` field listed "delete" instead of "remove"**: MongoDB's `currentOp` output reports delete operations as `"remove"` in the `op` field, not `"delete"`. The valid values are: none, update, insert, query, command, getmore, remove, killcursors. Fixed the key fields description and the write operations filter example to use `"remove"`.

2. **`db.adminCommand({ currentOp: 1 })` labeled as "newer preferred syntax"**: The `currentOp` admin command has been deprecated since MongoDB 4.2 in favor of the `$currentOp` aggregation stage. Calling it "newer preferred syntax" was misleading. Changed the comment to "Alternative admin command syntax (deprecated since MongoDB 4.2)".

## Review Notes
- The `currentOp` database command (used via `db.adminCommand`) is deprecated since MongoDB 4.2. The `$currentOp` aggregation stage (`db.aggregate([{ $currentOp: {} }])`) is the modern replacement. The `db.currentOp()` shell helper method itself still works and internally uses the aggregation stage in newer versions, so the post's primary examples remain valid.
- The `locks` field format shown (`{ Global: "r", Database: "r", Collection: "r" }`) uses lowercase `"r"` which represents Intent Shared (IS) locks. This is technically accurate for a read operation, though the post does not explain the distinction between lock modes (R=Shared, W=Exclusive, r=Intent Shared, w=Intent Exclusive).
- The continuous monitor using `while (true)` with `sleep(5000)` works in mongosh but would block the shell session. In production, dedicated monitoring tools (MongoDB Atlas, Ops Manager, or Prometheus with mongodb_exporter) are more appropriate.
