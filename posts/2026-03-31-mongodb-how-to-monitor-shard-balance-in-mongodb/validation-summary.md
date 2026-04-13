# Validation Summary: How to Monitor Shard Balance in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sharded clusters
- MongoDB config server metadata (`config.chunks`, `config.actionlog`, `config.changelog`, `config.settings`)
- `mongos` shell helpers (`sh.status()`, `sh.getBalancerState()`)
- `mongosh` CLI scripting
- Bash shell scripting for automated monitoring

## Sources Consulted
- MongoDB Manual: config.chunks collection schema (https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks)
- MongoDB Manual: sh.status() (https://www.mongodb.com/docs/manual/reference/method/sh.status/)
- MongoDB Manual: sh.getBalancerState() (https://www.mongodb.com/docs/manual/reference/method/sh.getBalancerState/)
- MongoDB Manual: Manage the Balancer (https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/)
- MongoDB Manual: balancerStatus command (https://www.mongodb.com/docs/manual/reference/command/balancerStatus/)
- MongoDB 6.0 Release Notes — sharding metadata changes (ns to uuid in config.chunks)
- Other posts in this repo that correctly use `uuid` pattern (e.g., `mongodb-monitor-chunk-distribution`, `mongodb-move-chunk-manually`)

## Issues Found

### 1. `config.chunks` queries used deprecated `ns` field (4 locations)
- **What was wrong:** All queries against `config.chunks` filtered by `{ ns: "mydb.orders" }`. Starting in MongoDB 6.0 (released 2022), the `ns` field was removed from `config.chunks` and replaced by `uuid`. These queries return no results on MongoDB 6.0+.
- **What was changed:** Updated all four occurrences (aggregate query, jumbo chunks query, and shell script) to first look up the collection UUID via `db.collections.findOne({ _id: "mydb.orders" }).uuid` and then filter by `{ uuid: collUUID }`.
- **Why:** MongoDB 6.0+ is the only supported version family as of 2026. The `ns` field no longer exists in `config.chunks`.

### 2. `sh.isBalancerRunning()` is deprecated/removed
- **What was wrong:** The post used `sh.isBalancerRunning()` which was deprecated in MongoDB 6.0 and removed in later versions.
- **What was changed:** Replaced with `db.adminCommand({ balancerStatus: 1 })` which returns an `inBalancerRound` field indicating whether the balancer is currently active.
- **Why:** `sh.isBalancerRunning()` is no longer available in current MongoDB versions. The `balancerStatus` admin command is the supported replacement.

## Review Notes
- The `config.migrations` collection referenced in the "Checking Active Migrations" section is less commonly documented than using `db.currentOp()` to check for in-flight migrations. It may work, but readers should be aware that `db.adminCommand({ currentOp: true, desc: /moveChunk/ })` is the more widely documented approach.
- The `details.candidateChunks` field name in balancer round log entries should be verified against the reader's specific MongoDB version, as internal log field names can change between releases.
- The `sh.status()` output format shown is representative but may differ slightly depending on the MongoDB version and cluster configuration.
- The balancer window configuration via `config.settings` is correct and well-documented.
- The shell script logic is sound — the max/min ratio is a reasonable heuristic for detecting imbalance.
