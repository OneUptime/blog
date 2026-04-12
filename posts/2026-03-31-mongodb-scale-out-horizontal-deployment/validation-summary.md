# Validation Summary: How to Scale Out (Horizontal) a MongoDB Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB sharded clusters
- MongoDB `mongos` router
- MongoDB shell helpers (`sh.shardCollection`, `sh.addShard`, `sh.status`)
- MongoDB balancer and chunk migration
- MongoDB Node.js driver (`MongoClient` with `readPreference`)

## Sources Consulted
- MongoDB Sharding documentation: https://www.mongodb.com/docs/manual/sharding/
- MongoDB `sh.enableSharding()` deprecation notes (deprecated in 6.0): https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB `sh.shardCollection()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB `sh.addShard()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.addShard/
- MongoDB balancer configuration: https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/
- MongoDB Node.js driver read preference: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/

## Issues Found
- **Deprecated `sh.enableSharding()` call**: The post included a separate section ("Enable Sharding on a Database") using `sh.enableSharding("myDatabase")`, which was deprecated in MongoDB 6.0. Starting in MongoDB 6.0, `sh.shardCollection()` automatically enables sharding on the database, making the explicit call unnecessary. Merged the section into the shard key section and removed the deprecated call, adding a comment noting the automatic behavior in 6.0+.

## Review Notes
- All other code examples (`sh.shardCollection`, `sh.addShard`, `sh.status`, balancer window configuration, `config.chunks` aggregation, `MongoClient` read preference) are technically correct and use current APIs.
- The explanation of hashed vs range-based shard keys is accurate.
- The balancer `activeWindow` configuration syntax is correct.
- The `config.chunks` aggregation for monitoring chunk distribution per shard is a valid approach.
