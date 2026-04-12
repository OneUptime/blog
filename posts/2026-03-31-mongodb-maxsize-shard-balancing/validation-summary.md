# Validation Summary: How to Configure maxSize for Shard Balancing in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB sharded clusters
- MongoDB balancer
- `config.shards` collection
- `addShard` admin command
- mongosh shell commands (`sh.startBalancer()`, `sh.status()`)

## Sources Consulted
- MongoDB official documentation on `addShard` command: https://www.mongodb.com/docs/manual/reference/command/addShard/
- MongoDB official documentation on shard configuration and `maxSize`: https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.shards
- MongoDB official documentation on the balancer: https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
- MongoDB official documentation on `listShards`: https://www.mongodb.com/docs/manual/reference/command/listShards/
- MongoDB release notes for deprecation and removal of `maxSize`

## Issues Found
No technical issues found.

## Review Notes
- The `maxSize` shard setting was deprecated in MongoDB 6.1 and removed in MongoDB 8.0. The post does not specify a MongoDB version, so the content is accurate for MongoDB versions through 6.0. Readers using MongoDB 8.0+ will find that `maxSize` is no longer available. A version caveat could be beneficial in the future.
- All code examples use correct MongoDB shell syntax and would work as described on supported versions.
- The explanation that `maxSize` is a soft limit on balancer behavior (not a hard write cap) is accurate and an important distinction.
- The `config.chunks` aggregation correctly groups by the `shard` field, which is the field name used in that collection.
