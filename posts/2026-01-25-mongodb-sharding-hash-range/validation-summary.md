# Validation Summary: How to Scale MongoDB with Hash and Range Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sharded clusters
- Hashed sharding and ranged sharding
- MongoDB shard keys and compound shard keys
- MongoDB config servers, shard replica sets, and mongos routers
- MongoDB zone sharding and balancer management
- MongoDB Node.js driver connection options

## Sources Consulted
- MongoDB Manual: Sharding - https://www.mongodb.com/docs/manual/sharding/
- MongoDB Manual: Deploy a Self-Managed Sharded Cluster - https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/
- MongoDB Manual: Shard Keys - https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB Manual: Choose a Shard Key - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
- MongoDB Manual: Hashed Sharding - https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Manual: sh.shardCollection() - https://www.mongodb.com/docs/manual/reference/method/sh.shardcollection/
- MongoDB Manual: sh.enableSharding() - https://www.mongodb.com/docs/manual/reference/method/sh.enablesharding/
- MongoDB Manual: reshardCollection - https://www.mongodb.com/docs/manual/reference/command/reshardcollection/
- MongoDB Manual: refineCollectionShardKey - https://www.mongodb.com/docs/manual/reference/command/refinecollectionshardkey/
- MongoDB Manual: Config Database - https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB Manual: Manage Sharded Cluster Balancer - https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/
- MongoDB Manual: Zones - https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB Manual: sh.updateZoneKeyRange() - https://www.mongodb.com/docs/manual/reference/method/sh.updatezonekeyrange/
- MongoDB Manual: sh.addShard() - https://www.mongodb.com/docs/manual/reference/method/sh.addshard/

## Issues Found
- The post said shard keys cannot be changed without recreating the collection. Updated this to reflect MongoDB 5.0+ support for `reshardCollection` and shard-key refinement, while still warning that changing shard keys requires operational planning.
- The `config.chunks` example queried by `ns`, which is outdated for current MongoDB metadata. Updated it to look up the collection UUID in `config.collections` and query `config.chunks` by `uuid`.
- The manual chunk splitting example used `myapp.users`, which had previously been sharded on a hashed `userId`. Updated the example to split the range-sharded `analytics.events` collection by `timestamp`.
- The balancer window example used the deprecated `db.collection.update()` helper and assumed the current database was `config`. Updated it to `db.getSiblingDB("config").settings.updateOne(...)`.
- The zone sharding example defined ranges on `region` for a collection that had not been sharded on `region`. Updated the example to shard `myapp.customers` on `region` before assigning zone ranges.
- Several `createIndex()` and `getShardDistribution()` examples used the current `db` handle while operating on fully qualified namespaces such as `myapp.users`. Updated them to use `db.getSiblingDB(...)` so the index and distribution checks run against the intended database.
- Several mongosh examples mixed `mongosh "mongodb://..."` shell commands inside JavaScript code fences. Reworded those lines as comments so the JavaScript snippets remain valid mongosh input after connecting.
- Placeholder `ObjectId("...")` values were not valid ObjectId literals. Replaced them with valid 24-character hexadecimal ObjectId examples.
- The final warning repeated the outdated claim that changing a shard key requires recreating the collection. Updated it to describe shard-key changes as major operational changes.

## Review Notes
- `sh.enableSharding()` is still available, but MongoDB 6.0 and later do not require it before sharding a collection.
- Starting in MongoDB 6.0.3 and later, automatic chunk splitting behavior changed; current documentation describes automatic range creation, splitting, and distribution as part of balancing rather than the old standalone auto-split behavior.
