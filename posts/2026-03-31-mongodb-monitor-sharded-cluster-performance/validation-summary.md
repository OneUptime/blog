# Validation Summary: How to Monitor Sharded Cluster Performance in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (sharded clusters)
- mongos router
- WiredTiger storage engine
- mongostat CLI tool
- MongoDB profiler
- MongoDB balancer
- Config servers (CSRS)

## Sources Consulted
- MongoDB official documentation: `sh.status()` — https://www.mongodb.com/docs/manual/reference/method/sh.status/
- MongoDB official documentation: `serverStatus` command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation: `mongostat` — https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB official documentation: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB official documentation: `explain()` on sharded clusters — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation: Balancer — https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
- MongoDB official documentation: `connPoolStats` — https://www.mongodb.com/docs/manual/reference/command/connPoolStats/
- MongoDB official documentation: `config.changelog` — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.changelog

## Issues Found
No technical issues found.

## Review Notes
- `sh.isBalancerRunning()` is deprecated in `mongosh` (MongoDB 6.0+). The legacy `mongo` shell still supports it. For modern deployments using `mongosh`, the recommended alternatives are `sh.getBalancerState()` (to check if the balancer is enabled) and `db.adminCommand({ balancerStatus: 1 })` (to check if the balancer is currently active). The post does not target a specific MongoDB version, so this is noted rather than changed.
- The `explain()` output description referencing `SHARD_MERGE` with `nShards` is a simplified but accurate representation of the sharded explain output structure. The `executionStats.executionStages.nShards` field does exist in sharded explain results.
- The `shardingStatistics` section and the referenced field `totalRequestsWithoutShardKeyInFindAndModify` relates to metrics introduced around MongoDB 7.0 for tracking operations that lack a shard key. Readers on older versions may not see this field.
- The alert thresholds in the table are reasonable starting points but should be tuned per deployment. For example, the queued read/write tickets threshold of > 10 is quite aggressive given the default WiredTiger concurrent transaction limits of 128.
