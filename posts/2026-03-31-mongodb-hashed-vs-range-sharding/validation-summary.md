# Validation Summary: How to Use Hashed Sharding vs Range Sharding in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharding architecture)
- MongoDB Shell (mongosh)
- Node.js MongoDB Driver
- Hashed sharding
- Range sharding
- Compound shard keys
- Zone sharding

## Sources Consulted
- MongoDB Manual: Hashed Sharding — https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Manual: Ranged Sharding — https://www.mongodb.com/docs/manual/core/ranged-sharding/
- MongoDB Manual: Zone Sharding — https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB Manual: Compound Hashed Indexes (4.4+) — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/#compound-hashed-indexes
- MongoDB Manual: sh.shardCollection() — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Node.js Driver API — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

1. **Misleading compound shard key comment (line 155):** The code comment said "customerId (hashed for distribution)" but the actual index was `{ customerId: 1, createdAt: 1 }` — a range-based compound key, not hashed. Fixed the comment to say "customerId (range-based prefix for targeting)" to accurately describe what `1` means.

2. **Node.js code used mongosh-only API (line 195):** `db.getSiblingDB("config")` is a mongosh shell helper method not available in the Node.js MongoDB driver. Changed to `client.db("config")` which is the correct Node.js driver equivalent.

3. **Zone sharding support incorrectly listed as "No" for hashed sharding (line 148):** The comparison table claimed hashed sharding does not support zone sharding. MongoDB 4.4+ supports zones with hashed shard keys (defined on the hashed value ranges). Changed to "Yes (on hashed values)".

4. **Incorrect claim that compound hashed shard keys are not supported (line 232):** The best practices section stated "a compound hashed+range index is not supported. Hashed shard keys must be single-field." This is incorrect for MongoDB 4.4+, which introduced compound hashed indexes with a single hashed field. Rewrote to correctly document the feature.

5. **Misleading "Good for time-series: Yes" for hashed sharding (line 145):** The comparison table said hashed sharding is good for time-series, but time-series workloads typically involve range queries on timestamps, which become scatter-gather under hashed sharding. Changed to "Writes only (reads scatter)" to clarify the trade-off.

## Review Notes
- The `sh.enableSharding()` command (line 45) is no longer required starting in MongoDB 6.0 and was removed in MongoDB 8.0. It still works in earlier versions. The post doesn't specify a MongoDB version, so this is acceptable but could be noted in a future update.
- The explain output structure (`executionStats.executionStages.shards`) for the Node.js example is version-dependent and may differ across MongoDB versions. The general approach is correct but readers may need to adapt the field paths.
- The `ns` field used in the chunk distribution query (`{ $match: { ns: "myapp.orders" } }`) was replaced by `uuid` in the config.chunks collection starting in MongoDB 6.0+. This could be noted for readers on newer versions.
