# Validation Summary: What Is the MongoDB Balancer and How It Works

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB sharding
- MongoDB balancer
- MongoDB `mongos` shell helpers (`sh.getBalancerState()`, `sh.isBalancerRunning()`, `sh.stopBalancer()`, `sh.startBalancer()`, `sh.status()`)
- MongoDB config server (`config.settings`, `config.changelog`, `config.chunks` collections)

## Sources Consulted
- MongoDB official documentation: Sharding — Balancer (https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/)
- MongoDB official documentation: Chunk Migration (https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/#chunk-migration-procedure)
- MongoDB official documentation: Migration Thresholds (https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/#migration-thresholds)
- MongoDB official documentation: Chunk Size (https://www.mongodb.com/docs/manual/core/sharding-data-partitioning/#chunk-size)
- MongoDB official documentation: sh.stopBalancer() (https://www.mongodb.com/docs/manual/reference/method/sh.stopBalancer/)
- MongoDB 3.4 Release Notes — balancer moved to config server primary (https://www.mongodb.com/docs/manual/release-notes/3.4/)

## Issues Found

1. **Balancer location was described inaccurately.** The post stated the balancer "runs on the `mongos` router (or the config server primary in newer versions)." Since MongoDB 3.4 (released 2016), the balancer runs on the config server primary, not on mongos. All currently supported MongoDB versions use the config server primary. Fixed the phrasing to lead with the config server primary and note the mongos behavior as historical (pre-3.4).

2. **Chunk migration step order was incorrect.** The post listed the steps as: (1) copy documents, (2) delete from source, (3) update config server metadata. In reality, the config server metadata is updated *before* the source shard deletes orphaned documents. After the metadata update, mongos routers direct queries to the destination shard, and the source shard cleans up orphaned documents asynchronously. Fixed the order and clarified the asynchronous nature of orphan cleanup.

## Review Notes
- The migration threshold table (fewer than 20 → 2, 20–79 → 4, 80+ → 8) is correct but worth noting that MongoDB may change these thresholds in future versions.
- The default chunk size of 128 MB is correct for MongoDB 6.0.3+. Earlier versions used 64 MB as the default. The post does not specify a version, which is acceptable since 128 MB is the current default.
- The `sh.stopBalancer(60000)` timeout parameter usage is valid in both the legacy `mongo` shell and `mongosh`.
