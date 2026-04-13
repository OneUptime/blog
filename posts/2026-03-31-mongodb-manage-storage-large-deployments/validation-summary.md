# Validation Summary: How to Manage Storage for Large MongoDB Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Shell (mongosh)
- MongoDB Sharding
- TTL Indexes
- Aggregation Pipeline ($merge stage)
- MongoDB compact command
- MongoDB configuration file (mongod.conf YAML format)

## Sources Consulted
- MongoDB Manual: db.stats() — https://www.mongodb.com/docs/manual/reference/method/db.stats/
- MongoDB Manual: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: serverStatus metrics.ttl — https://www.mongodb.com/docs/manual/reference/command/serverStatus/#mongodb-serverstatus-serverstatus.metrics.ttl
- MongoDB Manual: $merge Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB Manual: $out Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB Manual: sh.shardCollection() — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Manual: sh.enableSharding() — https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB Manual: compact Command — https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB Manual: storage Configuration Options — https://www.mongodb.com/docs/manual/reference/configuration-options/#storage-options

## Issues Found
1. **Section title said "$out" but code uses "$merge"**: The heading "Archiving Cold Data with $out" was incorrect. The code in that section uses the `$merge` aggregation stage, not `$out`. These are distinct operators — `$out` replaces the entire target collection, while `$merge` supports upsert behavior with `whenMatched`/`whenNotMatched` options. Fixed the heading to "Archiving Cold Data with $merge".

2. **Incorrect claim that `compact` blocks reads/writes**: The code comment stated that `compact` "blocks reads/writes during operation." Starting in MongoDB 4.4, the `compact` command no longer blocks reads and writes on the collection being compacted. Updated the comment to reflect this.

## Review Notes
- `sh.enableSharding()` is no longer required as of MongoDB 6.0 (databases are automatically enabled for sharding when the first collection is sharded). The command still works for backward compatibility but is deprecated in MongoDB 8.0. The post does not specify a MongoDB version, so this was left as-is but is worth noting for future updates.
- The growth rate math is correct: 1.2^4 ≈ 2.07, so 20% monthly growth roughly doubles capacity needs every four months.
- The TTL `expireAfterSeconds: 7776000` correctly equals 90 days (90 × 86400 = 7,776,000).
- The `$merge` syntax with `into: { db: "archive", coll: "orders" }` and the `whenMatched`/`whenNotMatched` options are correct per the MongoDB aggregation documentation.
- The YAML storage configuration with `directoryPerDB` and `wiredTiger.engineConfig.directoryForIndexes` is accurate.
