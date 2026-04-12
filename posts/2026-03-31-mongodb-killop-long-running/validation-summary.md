# Validation Summary: How to Kill Long-Running MongoDB Operations with db.killOp()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (db.killOp(), db.currentOp(), $currentOp aggregation stage)
- MongoDB Shell (mongosh / legacy mongo shell)
- MongoDB Sharded Clusters (mongos, shard-level operations)
- MongoDB Role-Based Access Control (killop privilege, built-in roles)

## Sources Consulted
- MongoDB official docs: db.killOp() method — https://www.mongodb.com/docs/manual/reference/method/db.killOp/
- MongoDB official docs: killOp command — https://www.mongodb.com/docs/manual/reference/command/killOp/
- MongoDB official docs: db.currentOp() method — https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB official docs: Built-in Roles — https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB official docs: Atomicity and Transactions — https://www.mongodb.com/docs/manual/core/write-operations-atomicity/

## Issues Found

1. **Incorrect claim about partial write rollback**: The post stated "The operation rolls back any partial writes (for write operations)." This is incorrect for non-transactional multi-document writes (`updateMany`, `deleteMany`, `insertMany`). Documents already modified before the kill signal is processed are NOT rolled back — only the remaining work is stopped. Fixed to clarify that only transactional writes are fully rolled back.

2. **Incorrect role in permissions table**: The post listed `clusterMonitor` as a role that grants the `killop` privilege. The `clusterMonitor` role provides read-only monitoring access and does NOT include `killop`. The correct role is `hostManager` (which includes `killop`), or `clusterAdmin` (which inherits it via `hostManager`). Also removed `clusterManager` from the "kill all" row since it also does not directly include `killop`. Fixed the table accordingly.

3. **Incomplete sharded cluster guidance**: The post stated you must always connect directly to the shard's mongod to kill operations. This is incomplete — `db.killOp()` on `mongos` can kill read operations spanning multiple shards. For session-based writes, `killSessions` on mongos is the correct approach. Direct shard connection is only required for non-session write operations. Updated to cover all scenarios.

4. **Incorrect summary claim about write rollback**: The summary section stated "Write operations are safely rolled back," which repeats the same inaccuracy from issue #1. Fixed to distinguish between transactional and non-transactional writes.

## Review Notes
- The post describes `opid` as "numeric" in the Syntax section. On standalone/replica set deployments this is correct, but on sharded clusters viewed through `mongos`, the opid is a string in `"shardName:number"` format (e.g., `"shard1:12345"`). The post's examples all show standalone/replica set scenarios where numeric opids are correct, so this was not changed, but a future improvement could note the string format for sharded clusters.
- The `$currentOp` aggregation section is labeled "MongoDB 3.6+" which is accurate — the `$currentOp` aggregation stage was introduced in MongoDB 3.6.
- All JavaScript code examples use valid syntax and correct MongoDB shell API calls.
- The mermaid diagram is accurate and helpful.
