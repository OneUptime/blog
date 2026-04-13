# Validation Summary: How to Balance Chunks in a MongoDB Sharded Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharding, chunk balancer, config database)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB documentation: Sharding — Chunk Migration (https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/)
- MongoDB documentation: sh.status() (https://www.mongodb.com/docs/manual/reference/method/sh.status/)
- MongoDB documentation: sh.moveChunk() (https://www.mongodb.com/docs/manual/reference/method/sh.moveChunk/)
- MongoDB documentation: sh.splitAt() (https://www.mongodb.com/docs/manual/reference/method/sh.splitAt/)
- MongoDB documentation: config.chunks collection (https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks)
- MongoDB documentation: config.settings collection (https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.settings)
- MongoDB 6.0 Release Notes — config.chunks schema changes (ns replaced by uuid)
- mongosh Database class API (https://www.mongodb.com/docs/mongodb-shell/reference/methods/)

## Issues Found

### Issue 1: `.collection()` used in mongosh shell examples (incorrect API)
- **What was wrong:** Five shell code blocks used `db.getSiblingDB("config").collection("settings")` or `.collection("chunks")`. The `.collection()` method belongs to the Node.js driver's `Db` class and does not exist on the `Database` object in mongosh. Running these in the shell would throw a TypeError.
- **What was changed:** Replaced all shell `.collection("name")` calls with direct property access (e.g., `db.getSiblingDB("config").settings`, `db.getSiblingDB("config").chunks`), which is the correct mongosh syntax.
- **Why:** mongosh exposes collections via property access (`db.collectionName`) or `db.getCollection("collectionName")`, not `.collection()`.

### Issue 2: `ns` field in `config.chunks` queries (deprecated since MongoDB 6.0)
- **What was wrong:** Both the shell and Node.js examples queried `config.chunks` with `{ ns: "myapp.orders" }`. Starting in MongoDB 6.0, the `ns` field was removed from `config.chunks` documents and replaced with `uuid` (the collection's UUID from `config.collections`). These queries would silently return empty results on MongoDB 6.0+.
- **What was changed:** Updated the shell chunk distribution query to first look up the collection UUID from `config.collections`, then match chunks by `uuid`. Applied the same fix to the Node.js monitoring example.
- **Why:** Since this post targets modern MongoDB (written in 2026, well after MongoDB 6.0), the queries must use the current `config.chunks` schema.

## Review Notes
- The claim "default: 1 migration per shard pair at a time" is correct per-pair, but starting in MongoDB 6.0 the balancer can run multiple concurrent migrations across different shard pairs. The post could mention this for completeness but is not incorrect as stated.
- `sh.getBalancerState()` is functional but newer mongosh versions also expose `sh.isBalancerEnabled()` as a clearer alias. Both work.
- The Node.js example uses `require("mongodb")` (CommonJS). This is fine but could also use ES module syntax for modern Node.js projects.
- The `sh.status()` sample output uses a format closer to older MongoDB versions but the structure is representative enough to illustrate the concept.
