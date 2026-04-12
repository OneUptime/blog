# Validation Summary: How to Shard a Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded clusters, mongos, config servers)
- MongoDB Shell (`sh` helper methods, `db` methods)
- Sharding concepts (ranged, hashed, compound shard keys, chunk splitting, balancer)

## Sources Consulted
- MongoDB official documentation on shardCollection: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB official documentation on enableSharding: https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB official documentation on shard keys: https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB official documentation on hashed sharding: https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB 6.0 release notes (enableSharding deprecation): https://www.mongodb.com/docs/manual/release-notes/6.0/

## Issues Found
1. **`sh.enableSharding()` deprecation not mentioned.** The post presented `sh.enableSharding()` as a required step without noting that it has been deprecated since MongoDB 6.0 (released July 2022). Starting in MongoDB 6.0, the database is automatically enabled for sharding when you shard its first collection. Added a note clarifying this.

2. **Misleading claim about hashed shard key index auto-creation.** The post stated "For a hashed shard key, MongoDB creates the index automatically during `shardCollection`", implying this behavior is specific to hashed keys. In reality, MongoDB auto-creates the supporting index for both ranged and hashed shard keys, but only when the collection is empty. For non-empty collections, the index must be created manually regardless of shard key type. Rewrote the section to accurately describe the behavior for both empty and non-empty collections, and added an example of creating a hashed index.

## Review Notes
- The `sh.status()` example output uses the `partitioned: true` field format, which is from older MongoDB versions. In MongoDB 6.0+ the output format may differ slightly, but this is acceptable for illustrative purposes.
- All other code examples, shell methods, shard key guidance, and explanations of targeted vs scatter-gather queries are technically accurate.
- The post does not specify a MongoDB version, which is fine for a general guide but means readers should check for version-specific behavior differences.
