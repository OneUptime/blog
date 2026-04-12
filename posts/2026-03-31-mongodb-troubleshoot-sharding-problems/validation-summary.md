# Validation Summary: How to Troubleshoot MongoDB Sharding Problems

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (sharding, balancer, config servers, chunk management)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: cleanupOrphaned command — https://www.mongodb.com/docs/manual/reference/command/cleanuporphaned/
- MongoDB Manual: Config Database (config.chunks schema changes) — https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB Manual: clearJumboFlag command — https://www.mongodb.com/docs/manual/reference/command/clearjumboflag/
- MongoDB Manual: Config Servers — https://www.mongodb.com/docs/manual/core/sharded-cluster-config-servers/
- MongoDB Manual: sh.isBalancerRunning() — https://www.mongodb.com/docs/manual/reference/method/sh.isbalancerrunning/
- MongoDB Manual: flushRouterConfig — https://www.mongodb.com/docs/manual/reference/command/flushrouterconfig/
- MongoDB JIRA SERVER-53105: Remove namespace field from config.chunks

## Issues Found
1. **config.chunks `ns` field removed in MongoDB 6.0+**: The queries in Step 3 used `{ ns: 'mydb.orders' }` to match chunks, but the `ns` field was replaced with `uuid` in MongoDB 6.0+. Added a MongoDB 6.0+ alternative that first retrieves the collection UUID from `config.collections` and then queries `config.chunks` by `uuid`.

2. **Jumbo flag cleared by directly modifying config.chunks**: The post used `db.chunks.updateOne()` to manually unset the `jumbo` flag on config.chunks. Since MongoDB 4.2.3, the recommended approach is the `clearJumboFlag` admin command. Replaced the manual update with `db.adminCommand({ clearJumboFlag: ... })`.

3. **Incorrect claim about config server RECOVERING state**: The post stated "A config server in RECOVERING state will cause write failures on mongos." This is incorrect — a single member in RECOVERING does not cause failures as long as the replica set maintains a majority and a primary. Fixed the comment to clarify that failures occur when enough members are down to prevent a majority.

4. **cleanupOrphaned unnecessary on modern MongoDB**: The post presented `cleanupOrphaned` without noting that since MongoDB 4.4, the range deleter automatically cleans up orphaned documents. The command is also deprecated as of MongoDB 8.0. Added context about automatic cleanup on 4.4+ and scoped the manual command to MongoDB 4.2 and earlier.

## Review Notes
- The `config.chunks.find({ ns: ..., jumbo: true })` query for finding jumbo chunks also needs the `uuid` adjustment on MongoDB 6.0+; a note was added referencing the earlier step.
- `sh.isBalancerRunning()` and `sh.getBalancerState()` are both still valid and not deprecated.
- `flushRouterConfig` with a namespace argument is valid since MongoDB 4.0.6.
- The `config.changelog` query using `details.ok: 0` for failed migrations may not match on all MongoDB versions, as the `details` subdocument structure can vary. This was left as-is since it is a common pattern in MongoDB troubleshooting guides.
