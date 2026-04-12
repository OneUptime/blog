# Validation Summary: How to Handle Unbalanced Shards in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharding, balancer, chunk management)
- MongoDB Shell (`mongosh`) helper methods (`sh.*`, `db.adminCommand`)
- MongoDB config database (`config.chunks`, `config.settings`, `config.collections`)

## Sources Consulted
- MongoDB official documentation: Sharding — https://www.mongodb.com/docs/manual/sharding/
- MongoDB official documentation: Balancer — https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
- MongoDB official documentation: moveChunk — https://www.mongodb.com/docs/manual/reference/command/moveChunk/
- MongoDB official documentation: split — https://www.mongodb.com/docs/manual/reference/command/split/
- MongoDB official documentation: sh.startBalancer() — https://www.mongodb.com/docs/manual/reference/method/sh.startBalancer/
- MongoDB official documentation: config.chunks — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks
- MongoDB official documentation: refineCollectionShardKey — https://www.mongodb.com/docs/manual/reference/command/refineCollectionShardKey/
- MongoDB official documentation: Migration Thresholds — https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/#migration-thresholds

## Issues Found

1. **`sh.awaitBalancerRound()` does not exist** (Enabling the Balancer section): The method `sh.awaitBalancerRound()` is not a valid MongoDB shell method. There is no public API to wait for a balancer round to complete. Removed the invalid method call, leaving just `sh.startBalancer()`.

2. **Migration threshold claim was oversimplified** (Checking Shard Balance section): The post stated "An imbalance of more than 8 chunks triggers automatic balancing by default." The actual threshold varies based on total chunk count: 2 for collections with fewer than 20 chunks, 4 for 20–79 chunks, and 8 for 80 or more. Updated to reflect the accurate tiered thresholds.

3. **`config.chunks` queries used deprecated `ns` field** (multiple sections): In MongoDB 6.0+, the `config.chunks` collection uses a `uuid` field instead of `ns` to identify the collection. All three occurrences of `{ ns: 'shop.orders' }` were updated to first look up the collection UUID from `config.collections` and then filter by `{ uuid: collUUID }`. This ensures the queries work on current MongoDB versions.

## Review Notes
- The default chunk size of 128 MB stated in the post is correct for MongoDB 6.0.3+. Prior to that version, the default was 64 MB. The post does not specify a version, which is acceptable.
- The `refineCollectionShardKey` command mentioned in the summary was introduced in MongoDB 4.4 and is correctly referenced.
- In MongoDB 6.1+, the balancer uses a redesigned algorithm that does not rely on the fixed chunk-count migration thresholds described. The tiered threshold behavior (2/4/8) applies to the legacy balancer in earlier versions.
- The `getShardDistribution()` helper is the most portable way to check shard balance across MongoDB versions and is correctly recommended.
