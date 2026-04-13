# Validation Summary: How to Use Hashed Shard Keys in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharding, hashed indexes, compound shard keys)
- MongoDB Shell (`mongosh` / `sh.*` helpers)

## Sources Consulted
- MongoDB official documentation: Hashed Sharding — https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB official documentation: Hashed Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/
- MongoDB official documentation: sh.enableSharding() — https://www.mongodb.com/docs/manual/reference/method/sh.enablesharding/
- MongoDB official documentation: sh.shardCollection() — https://www.mongodb.com/docs/manual/reference/method/sh.shardcollection/
- MongoDB 8.0 Release Notes — https://www.mongodb.com/docs/manual/release-notes/8.0/
- MongoDB source code (hasher.cpp) — https://github.com/mongodb/mongo/blob/master/src/mongo/db/hasher.cpp

## Issues Found

1. **Incorrect hash algorithm description (line 21):** The post stated MongoDB uses "a 64-bit MD5 hash." MD5 produces a 128-bit digest; MongoDB internally uses MD5 but truncates the output to a 64-bit integer. The official documentation deliberately does not name the algorithm. Fixed to: "MongoDB computes a hash of the shard key value, producing a 64-bit integer."

2. **Missing version note for `sh.enableSharding()` (line 33):** The post listed `sh.enableSharding("myapp")` as a required step with no version caveat. Starting in MongoDB 6.0, this call is no longer required — the database is automatically enabled for sharding when you shard the first collection. Added a note clarifying this is skippable on MongoDB 6.0+.

3. **`numInitialChunks` parameter removed (line 62):** The post used `numInitialChunks` in a `sh.shardCollection()` call. This parameter was removed in MongoDB 7.2. On current MongoDB versions, initial chunk creation for hashed shard keys on empty collections is automatic. Updated the section to note the version constraint and current behavior.

4. **Incorrect compound hashed shard key restriction (line 101-108):** The post claimed "hashed field cannot be in the middle or end" of a compound shard key, and showed `{ level: 1, ts: "hashed" }` as invalid. This is wrong — since MongoDB 4.4, compound hashed shard keys support the hashed field at any position (prefix, middle, or end). The only restriction is that exactly one field can be hashed. Fixed to show both positions as valid.

## Review Notes
- The `sh.shardCollection()` method signature and basic usage are correct for current MongoDB versions.
- The scatter-gather behavior for range queries and sort operations on hashed shard keys is accurately described.
- The hashed vs ranged sharding comparison table is accurate.
- The `db.events.getShardDistribution()` usage is correct.
