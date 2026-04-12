# Validation Summary: How to Monitor Chunk Distribution in a Sharded MongoDB Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharded clusters)
- MongoDB shell (`mongosh`)
- MongoDB config database (`config.chunks`, `config.collections`, `config.changelog`, `config.settings`)
- MongoDB balancer
- `sh.status()`, `getShardDistribution()`, `sh.isBalancerRunning()`, `sh.getBalancerState()`

## Sources Consulted
- MongoDB Config Database Reference: https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB SERVER-53105 (Remove namespace field from config.chunks): https://jira.mongodb.org/browse/SERVER-53105
- MongoDB sh.isBalancerRunning() documentation: https://www.mongodb.com/docs/manual/reference/method/sh.isbalancerrunning/
- MongoDB Modify Chunk Size documentation: https://www.mongodb.com/docs/v6.0/tutorial/modify-chunk-size-in-sharded-cluster/
- MongoDB DOCS-14942 (Default chunk size increase): https://jira.mongodb.org/browse/DOCS-14942

## Issues Found
1. **`config.chunks` queries used deprecated `ns` field (3 occurrences)**: Starting in MongoDB 5.0+, the `config.chunks` collection replaced the `ns` (namespace) field with a `uuid` field (SERVER-53105). All three sections querying `config.chunks` used `{ ns: "myapp.orders" }` which returns no results on modern MongoDB. Fixed by adding a UUID lookup step via `db.collections.findOne({ _id: "myapp.orders" }).uuid` and using `{ uuid: collUUID }` in all chunk queries. Affected sections:
   - "Querying the Config Database Directly" (aggregate query)
   - "List All Chunks for a Collection" (find query)
   - "Find Jumbo Chunks" (find query with jumbo filter)

## Review Notes
- The default chunk size of 128 MB is correct for MongoDB 6.0+ (changed from 64 MB in MongoDB 5.2 via SERVER-61534).
- `sh.isBalancerRunning()` is still available and not deprecated in current MongoDB versions.
- The `sh.status()` and `getShardDistribution()` examples and output formats are accurate.
- The `config.changelog` query for migration history is correct.
- The `mongosh --eval 'use config; ...'` syntax works in `mongosh` but could be more portable using `db.getSiblingDB('config')` instead.
