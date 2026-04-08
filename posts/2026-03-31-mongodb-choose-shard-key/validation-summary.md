# Validation Summary: How to Choose a Shard Key in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (sharding, shard keys, hashed sharding, zone sharding)
- MongoDB Shell (`sh.shardCollection`, `db.adminCommand`, aggregation pipeline)
- MongoDB 4.2+ (mutable shard key values)
- MongoDB 5.0+ (online resharding via `reshardCollection`)

## Sources Consulted
- MongoDB Official Documentation: Shard Keys — https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB Official Documentation: Hashed Sharding — https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Official Documentation: sh.shardCollection() — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Official Documentation: reshardCollection — https://www.mongodb.com/docs/manual/reference/command/reshardCollection/
- MongoDB Official Documentation: Zones — https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB Official Documentation: currentOp — https://www.mongodb.com/docs/manual/reference/method/db.currentOp/

## Issues Found
- **"Monotonic write distribution" listed as a benefit of a good shard key (line 22)**: The term "monotonic" means always increasing or decreasing, which is actually the *problem* hashed keys solve. Hashed shard keys provide *even* (uniform) write distribution, not monotonic distribution. Changed "Monotonic write distribution (for hashed keys)" to "Even write distribution (for hashed keys)."

## Review Notes
- The checklist mentions "shard key immutable until 4.2" which is correct — starting in MongoDB 4.2, shard key values can be updated (with certain conditions, such as running in a transaction). This could benefit from a brief note about those conditions, but is not inaccurate as written.
- The `db.getSiblingDB("admin").currentOp(...)` call for monitoring resharding is functional but slightly redundant since `db.currentOp()` already runs against the admin database. Not incorrect, just verbose.
- All `sh.shardCollection()` calls use correct syntax and valid shard key specifications.
- The aggregation pipelines for evaluating cardinality and distribution are correct and practical.
- The `reshardCollection` admin command syntax is correct for MongoDB 5.0+.
