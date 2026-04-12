# Validation Summary: How to Perform Targeted Queries on a Sharded Collection in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharded clusters)
- MongoDB `mongos` query router
- MongoDB `explain()` for query analysis
- MongoDB `serverStatus` sharding metrics

## Sources Consulted
- MongoDB serverStatus command reference: https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB sharded cluster query router documentation: https://www.mongodb.com/docs/manual/core/sharded-cluster-query-router/
- MongoDB shard key documentation: https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB explain results reference: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB docs source on GitHub (serverStatus.txt): https://github.com/mongodb/docs/blob/master/source/reference/command/serverStatus.txt

## Issues Found
1. **Fabricated `serverStatus` field names in "Checking Query Routing in Production" section.**
   - **What was wrong:** The post referenced `totalRequestsWithTargetedShards` and `totalBroadcastRequests` as fields within `db.serverStatus().shardingStatistics`. These field names do not exist in any version of MongoDB.
   - **What was changed:** Replaced with the correct field `numHostsTargeted`, which is available on `mongos` and breaks down operations by type (`find`, `insert`, `update`, `delete`, `aggregate`) with counters for `oneShard` (targeted), `manyShards` (partially targeted), `allShards` (broadcast), and `unsharded`.
   - **Why:** The original field names would cause confusion when readers try to find them in actual `serverStatus` output. The corrected field names match the official MongoDB documentation.

## Review Notes
- The rest of the post is technically accurate: targeted vs broadcast query concepts, `explain()` output stages (`SINGLE_SHARD` vs `SHARD_MERGE`), compound shard key prefix targeting, range query behavior, and update/delete targeting rules are all correct.
- The `numHostsTargeted` field is available on `mongos` instances. The post could note this distinction in the future, as running `serverStatus` on a shard member returns different sharding statistics.
- The section title "Update and Delete Targeting" mentions deletes but only shows update examples. This is a minor omission, not a technical error.
