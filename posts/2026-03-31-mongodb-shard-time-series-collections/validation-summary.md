# Validation Summary: How to Shard Time Series Collections in MongoDB 8.0

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 8.0
- MongoDB Time Series Collections
- MongoDB Sharding (range-based and hashed)
- MongoDB Shell (`mongosh`) sharding helpers

## Sources Consulted
- [sh.enableSharding() - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/reference/method/sh.enablesharding/) — confirmed unnecessary since MongoDB 6.0
- [Shard a Time Series Collection - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/core/timeseries/timeseries-shard-collection/) — confirmed timeField in shard keys is deprecated in 8.0
- [Time Series Collection Limitations - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/core/timeseries/timeseries-limitations/) — confirmed zone sharding is not supported for time series collections
- [sh.shardCollection() - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/reference/method/sh.shardcollection/) — confirmed still valid; `sh.shardAndDistributeCollection()` is the newer recommended alternative
- [sh.addShardTag() - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/reference/method/sh.addshardtag/) — confirmed alias for `sh.addShardToZone()`
- [sh.splitAt() - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/reference/method/sh.splitat/) — confirmed still valid
- [sh.moveChunk() - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/reference/method/sh.movechunk/) — confirmed still valid
- [db.collection.getShardDistribution() - MongoDB v8.0 docs](https://www.mongodb.com/docs/v8.0/reference/method/db.collection.getShardDistribution/) — confirmed still valid

## Issues Found

1. **`sh.enableSharding()` is unnecessary since MongoDB 6.0**: The post had a separate section calling `sh.enableSharding("iot")`. Since MongoDB 6.0, databases are automatically enabled for sharding and this call is no longer required. Removed the dedicated section and added a note about this in the sharding section.

2. **timeField in shard key is deprecated in MongoDB 8.0**: The compound shard key `{"metadata.region": 1, "timestamp": 1}` included the `timeField` (`timestamp`), which is deprecated in MongoDB 8.0. MongoDB now logs warnings when shard keys contain the timeField and recommends resharding with only metaField subfields. Changed the shard key to `{"metadata.region": 1}`.

3. **Zone sharding does not support time series collections**: The post had a full section demonstrating zone sharding with `sh.addShardTag()` and `sh.addTagRange()` on a time series collection. Per MongoDB documentation, zone sharding is explicitly not supported for time series collections — the balancer always distributes data evenly across all shards. Replaced the section with a note about this limitation.

4. **Pre-splitting example used deprecated timeField in shard key**: The `sh.splitAt()` and `sh.moveChunk()` examples included `"timestamp": new Date(0)` as part of the split point, matching the original (incorrect) compound shard key. Updated to use only `"metadata.region"` to match the corrected shard key.

## Review Notes
- `sh.shardCollection()` is still valid but MongoDB 8.0 recommends `sh.shardAndDistributeCollection()` for new collections, which immediately distributes data across shards. The post could mention this as an alternative in a future update.
- `sh.addShardTag()`/`sh.addTagRange()` are legacy aliases for `sh.addShardToZone()`/`sh.updateZoneKeyRange()` — but this is moot for time series since zone sharding is not supported.
- `sh.moveChunk()` has a newer alternative `sh.moveRange()` in recent MongoDB versions, but `moveChunk` remains valid.
