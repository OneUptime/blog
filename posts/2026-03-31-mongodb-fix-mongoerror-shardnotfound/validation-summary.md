# Validation Summary: How to Fix MongoError: ShardNotFound in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (sharded clusters)
- mongos router
- Config servers
- Replica sets
- Zone-based sharding

## Sources Consulted
- MongoDB Error Codes Reference — https://www.mongodb.com/docs/manual/reference/error-codes/
- addShard command documentation — https://www.mongodb.com/docs/manual/reference/command/addShard/
- removeShard command documentation — https://www.mongodb.com/docs/manual/reference/command/removeShard/
- Remove Shards from Cluster tutorial — https://www.mongodb.com/docs/manual/tutorial/remove-shards-from-cluster/
- flushRouterConfig documentation — https://www.mongodb.com/docs/manual/reference/command/flushRouterConfig/
- updateZoneKeyRange documentation — https://www.mongodb.com/docs/manual/reference/command/updateZoneKeyRange/
- connPoolStats documentation — https://www.mongodb.com/docs/manual/reference/command/connPoolStats/
- sh.status() documentation — https://www.mongodb.com/docs/manual/reference/method/sh.status/
- rs.reconfig() documentation — https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/

## Issues Found
- **Step 3 — Incorrect use of `addShard` to update a shard's connection string**: The post originally suggested using `db.adminCommand({ addShard: "rs1/newhost1:27017,newhost2:27017", name: "shard1" })` to update an existing shard's host after an IP or DNS change. This is incorrect — `addShard` cannot modify an already-registered shard and will error if the shard name already exists. Fixed by replacing with `rs.reconfig()` on the shard's replica set primary, which is the correct way to update replica set member hostnames. The mongos routers and config servers automatically detect updated replica set membership.

## Review Notes
- The `removeShard` process description in Step 4 is correct but simplified. In practice, if there are unsharded collections on the shard being removed, you must also use `moveCollection` (MongoDB 8.0+) or `movePrimary` to relocate them. This is an acceptable simplification for a troubleshooting guide.
- All other commands (`listShards`, `flushRouterConfig`, `updateZoneKeyRange`, `connPoolStats`, `sh.status()`) are syntactically correct and accurately described.
- Error code 70 for `ShardNotFound` is confirmed correct.
