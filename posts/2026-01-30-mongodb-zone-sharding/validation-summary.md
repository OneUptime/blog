# Validation Summary: How to Create MongoDB Zone Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sharded clusters
- MongoDB zone sharding
- MongoDB balancer
- mongosh shell helpers
- MongoDB config database metadata

## Sources Consulted
- MongoDB Manual: Zones - https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB Manual: Manage Shard Zones - https://www.mongodb.com/docs/manual/tutorial/manage-shard-zone/
- MongoDB Manual: sh.addShardToZone() - https://www.mongodb.com/docs/manual/reference/method/sh.addshardtozone/
- MongoDB Manual: sh.updateZoneKeyRange() - https://www.mongodb.com/docs/manual/reference/method/sh.updatezonekeyrange/
- MongoDB Manual: updateZoneKeyRange command - https://www.mongodb.com/docs/manual/reference/command/updatezonekeyrange/
- MongoDB Manual: sh.removeRangeFromZone() - https://www.mongodb.com/docs/manual/reference/method/sh.removerangefromzone/
- MongoDB Manual: sh.removeShardFromZone() - https://www.mongodb.com/docs/manual/reference/method/sh.removeshardfromzone/
- MongoDB Manual: sh.getBalancerState() - https://www.mongodb.com/docs/manual/reference/method/sh.getbalancerstate/
- MongoDB Manual: sh.isBalancerRunning() - https://www.mongodb.com/docs/manual/reference/method/sh.isbalancerrunning/
- MongoDB Manual: Config Database - https://www.mongodb.com/docs/manual/reference/config-database/

## Issues Found
- The prerequisites stated that zone sharding requires at least 3 shards. MongoDB zone sharding does not have that fixed minimum; the required shard count depends on the intended zone layout. Updated the wording to say the cluster needs enough shards for the zone layout.
- The balancer monitoring example used `db.locks.find({ _id: "balancer" })` as a current operations check. MongoDB documents `sh.getBalancerState()` for enabled/disabled state and `sh.isBalancerRunning()` for current balancer state. Replaced the lock query with `sh.isBalancerRunning()`.
- The chunk compliance script queried `config.chunks` by `ns`, but modern MongoDB metadata stores chunk records by collection `uuid`. Updated the script to retrieve the collection UUID from `config.collections` and query `config.chunks` by `uuid`.
- The chunk compliance script referenced `getExpectedZone()` without defining it. Added a small helper for the article's region-based example so the script is complete.
- The monthly time-zone rotation example could create overlapping zone ranges because it added new HOT and WARM ranges without removing exact old ranges first. Updated the script to remove the old overlapping ranges before adding the new ranges, and added a COLD range for data aging out of the warm window.

## Review Notes
The core zone sharding APIs and explanations were otherwise consistent with MongoDB documentation: zone ranges are lower-bound inclusive and upper-bound exclusive, ranges cannot overlap, zones can include multiple shards, shards can belong to multiple zones, and the balancer migrates chunks to satisfy zone constraints after it runs.
