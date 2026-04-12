# Validation Summary: How to Choose Shard Keys for Write Distribution in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (sharding, shard keys, hashed sharding, compound shard keys)
- MongoDB Shell (`sh.shardCollection`, `db.adminCommand`, `getShardDistribution`)
- mongostat CLI tool
- Node.js MongoDB driver (insert examples)

## Sources Consulted
- MongoDB official documentation on shard key selection: https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
- MongoDB official documentation on hashed sharding: https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB official documentation on `sh.shardCollection()`: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB official documentation on compound hashed shard keys (4.4+): https://www.mongodb.com/docs/manual/core/sharding-compound-hashed-shard-key/
- MongoDB official documentation on `mongostat`: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB official documentation on `getShardDistribution()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.getShardDistribution/

## Issues Found
1. **Collection name mismatch in Solution 3**: The insert operation used `db.collection('events')` but the `sh.shardCollection` call targeted the `events.raw` namespace (database=`events`, collection=`raw`). Within the same code block, this meant the insert was writing to a different collection than the one being sharded. Fixed `db.collection('events')` to `db.collection('raw')`.

2. **Inconsistent collection name in Verification section**: `db.orders.getShardDistribution()` referenced a collection (`orders`) not used anywhere else in the post. Changed to `db.raw.getShardDistribution()` for consistency with the `events.raw` namespace used throughout.

## Review Notes
- Compound hashed shard keys (e.g., `{ region: 1, _id: 'hashed' }` in Solution 2) require MongoDB 4.4 or later. The post does not mention this version requirement. A future update could add a note about this.
- The claim "Hashed sharding guarantees even write distribution" is a slight overstatement -- hashed sharding provides near-even distribution but is not a strict mathematical guarantee (hash collisions, chunk migration lag, etc.). This phrasing is common in MongoDB literature and is acceptable.
- The `region` field used as a "high-cardinality prefix" example in Solution 2 is somewhat questionable since geographic regions are typically low cardinality. The text correctly instructs readers to use a high-cardinality field, but the example name could be misleading. A future update could use a better example like `tenantId` or `deviceId`.
