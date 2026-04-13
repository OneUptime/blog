# Validation Summary: How to Enable Sharding on a MongoDB Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded clusters)
- mongosh (MongoDB Shell)
- MongoDB sharding APIs (`sh.enableSharding()`, `sh.shardCollection()`, `sh.status()`)

## Sources Consulted
- [sh.enableSharding() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/sh.enablesharding/)
- [enableSharding command - MongoDB Manual v7.0](https://www.mongodb.com/docs/v7.0/reference/command/enablesharding/)
- [sh.shardCollection() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/sh.shardcollection/)
- [db.collection.getShardDistribution() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.collection.getsharddistribution/)
- [Config Database - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/config-database/)
- [SERVER-60926 - Make enableSharding command optional](https://jira.mongodb.org/browse/SERVER-60926)
- [SERVER-53105 - Remove namespace field from config.chunks](https://jira.mongodb.org/browse/SERVER-53105)

## Issues Found

1. **`sh.enableSharding()` presented as required without version caveat.** Starting in MongoDB 6.0, `sh.enableSharding()` is no longer required; sharding is automatically enabled on a database when you shard its first collection with `sh.shardCollection()`. Added a note clarifying this and updated the summary paragraph.

2. **`config.chunks` query uses removed `ns` field.** The `ns` field was removed from the `config.chunks` collection starting in MongoDB 5.0 and replaced with `uuid`. The original aggregation pipeline (`{ $match: { ns: "myDatabase.events" } }`) would return no results on MongoDB 5.0+. Replaced with `db.events.getShardDistribution()`, which is a built-in mongosh helper that works across all modern MongoDB versions and provides the same chunk distribution information.

3. **Summary paragraph implied two-step process is always required.** Updated to clarify that on MongoDB 6.0+, `sh.enableSharding()` can be skipped.

## Review Notes
- The `listDatabases` admin command shown in "Verify Sharding Is Enabled" lists databases but does not directly indicate whether sharding is enabled on them. `sh.status()` (shown immediately above it) is the correct way to verify sharding status. The `listDatabases` example is not wrong but is less relevant to the stated goal of verifying sharding. This is a minor clarity issue, not a technical error.
- The post does not specify a target MongoDB version. The fixes ensure the content is accurate for both pre-6.0 and modern MongoDB versions.
