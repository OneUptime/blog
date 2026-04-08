# Validation Summary: How to Use Compound Shard Keys in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharding, compound shard keys)
- MongoDB Shell (`sh.shardCollection`, `createIndex`, `explain`)

## Sources Consulted
- MongoDB Manual: Shard Keys — https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB Manual: Hashed Sharding — https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Manual: Compound Hashed Indexes (4.4+) — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/#compound-hashed-indexes
- MongoDB Manual: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: sh.shardCollection() — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/

## Issues Found
1. **Hashed field position restriction was outdated.** The post stated the hashed field "must be the first" field in a compound shard key and marked `{ ts: 1, userId: "hashed" }` as invalid. Since MongoDB 4.4, compound hashed indexes support the hashed field in any position. Updated the section to reflect this and noted the 4.4 version requirement.

2. **Incorrect explain output guidance.** The post advised looking for `SHARD_MERGE` with `nShards: 1` to verify a targeted query. In MongoDB's sharded explain output, a targeted query shows a `SINGLE_SHARD` stage, while `SHARD_MERGE` indicates the query hit multiple shards. Corrected the guidance accordingly.

## Review Notes
- The general advice on compound key field ordering (equality fields first, range fields last) aligns with MongoDB best practices.
- The query targeting rules and prefix-based routing explanation are accurate.
- The note about creating indexes before sharding existing collections is correct.
