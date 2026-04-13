# Validation Summary: How to Handle Hot Shard Problems in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (sharding, balancer, zone sharding)
- mongosh (shell helpers: sh.getBalancerState, sh.startBalancer, sh.addShardToZone, sh.updateZoneKeyRange)
- mongostat CLI tool
- refineCollectionShardKey (MongoDB 4.4+)

## Sources Consulted
- MongoDB Manual — sh.addShardToZone(): https://www.mongodb.com/docs/manual/reference/method/sh.addShardToZone/
- MongoDB Manual — sh.updateZoneKeyRange(): https://www.mongodb.com/docs/manual/reference/method/sh.updateZoneKeyRange/
- MongoDB Manual — sh.addShardTag() (deprecated): https://www.mongodb.com/docs/manual/reference/method/sh.addShardTag/
- MongoDB Manual — sh.addTagRange() (deprecated): https://www.mongodb.com/docs/manual/reference/method/sh.addTagRange/
- MongoDB Manual — refineCollectionShardKey: https://www.mongodb.com/docs/manual/reference/command/refineCollectionShardKey/
- MongoDB Manual — split command: https://www.mongodb.com/docs/manual/reference/command/split/
- MongoDB Manual — Balancer: https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
- MongoDB Manual — getShardDistribution(): https://www.mongodb.com/docs/manual/reference/method/db.collection.getShardDistribution/
- MongoDB Manual — mongostat: https://www.mongodb.com/docs/database-tools/mongostat/

## Issues Found
1. **Code block language tag for serverStatus command (line 49)**: The `db.adminCommand({ serverStatus: 1 }).opcounters` command was inside a `bash` code block with a bash-style `#` comment. Changed to a `javascript` code block with a `//` comment, since this is a mongosh command, not a shell command.

2. **Deprecated zone sharding methods (lines 124-139)**: `sh.addShardTag()` and `sh.addTagRange()` were deprecated in MongoDB 3.4 in favor of `sh.addShardToZone()` and `sh.updateZoneKeyRange()`. Updated to the current API methods. Also changed the comment from "Tag shard0 and shard1" to "Assign shard0 and shard1" to match the modern "zone" terminology.

## Review Notes
- The `refineCollectionShardKey` command was correctly identified as a MongoDB 4.4+ feature. Starting in MongoDB 5.0, `reshardCollection` is also available as an alternative that allows changing the shard key entirely (not just adding suffix fields). The post could mention this in a future update but it is not an error.
- All balancer shell helpers (`sh.getBalancerState()`, `sh.startBalancer()`, `sh.isBalancerRunning()`) are current and correct.
- The `split` admin command syntax with `middle` is correct.
- The explanation of hot shard causes (monotonic keys, low cardinality, popular data concentration) is accurate and well-presented.
