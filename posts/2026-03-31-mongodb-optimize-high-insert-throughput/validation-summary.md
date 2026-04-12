# Validation Summary: How to Optimize MongoDB for High Insert Throughput

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongosh shell, WiredTiger storage engine)
- MongoDB Sharding (hashed shard keys, chunk management)
- MongoDB Time Series Collections
- MongoDB Write Concern
- MongoDB Aggregation Framework (`$indexStats`)

## Sources Consulted
- MongoDB documentation: `db.collection.insertMany()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/
- MongoDB documentation: `$indexStats` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB documentation: Write Concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB documentation: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB documentation: `db.setProfilingLevel()` — https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/
- MongoDB documentation: `sh.shardCollection()` — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB documentation: `sh.splitAt()` — https://www.mongodb.com/docs/manual/reference/method/sh.splitAt/
- MongoDB documentation: `split` command — https://www.mongodb.com/docs/manual/reference/command/split/
- MongoDB documentation: Hashed Sharding — https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB documentation: WiredTiger Storage Engine configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB

## Issues Found
- **Section 8 — Pre-split Chunks on Sharded Clusters**: The original code used `sh.splitAt("mydb.readings", { sensorId: i })` in a loop from 0 to 99 to pre-split a hashed shard key collection. This is incorrect for two reasons: (1) MongoDB documentation explicitly states that the `split` command's `middle` parameter (which `sh.splitAt` uses internally) should not be used with hashed shard keys — the `bounds` parameter should be used instead; (2) the integer values 0–99 are interpreted as raw values in the hash space, not as original field values to be hashed, so they cluster splits in a tiny fraction of the full 64-bit hash range (~-2^63 to 2^63), producing useless pre-splitting. **Fix applied**: Replaced the `sh.splitAt` loop with the recommended `numInitialChunks` option passed to `sh.shardCollection()`, which evenly distributes initial chunks across the hash space.

## Review Notes
- The `numInitialChunks` parameter is supported through MongoDB 8.0 for hashed shard keys but is being gradually phased out in favor of automatic chunk distribution. In MongoDB 8.0+, the default is 1 initial chunk per shard. Future MongoDB versions may remove this parameter entirely (tracked in SERVER-82611).
- All other code examples (bulk inserts, write concern tuning, time series collections, index stats, profiler settings, WiredTiger cache config, basic shardCollection) are technically correct and use current APIs.
- The claim that `ordered: false` "enables parallel processing" is a slight simplification — MongoDB may reorder documents for performance but the exact parallelism is implementation-dependent. The practical advice is sound.
