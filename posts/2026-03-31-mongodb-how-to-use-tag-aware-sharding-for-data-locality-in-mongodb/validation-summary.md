# Validation Summary: How to Use Tag-Aware Sharding for Data Locality in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB sharding (zone-based / tag-aware sharding)
- MongoDB shell helpers (`sh.*` methods)
- MongoDB config database (`config.shards`, `config.tags`)
- MongoDB balancer

## Sources Consulted
- MongoDB official documentation on zone sharding: https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB `sh.addShardToZone()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.addShardToZone/
- MongoDB `sh.updateZoneKeyRange()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.updateZoneKeyRange/
- MongoDB `sh.removeRangeFromZone()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.removeRangeFromZone/
- MongoDB `sh.removeShardFromZone()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.removeShardFromZone/
- MongoDB `sh.enableSharding()` deprecation notes: https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB 6.0 and 8.0 release notes regarding `enableSharding` removal

## Issues Found
1. **Removed deprecated `sh.enableSharding("mydb")` call in Step 2.** The `sh.enableSharding()` method was deprecated in MongoDB 6.0 (became a no-op) and removed entirely in MongoDB 8.0. Since this post is published in 2026, most readers will be running MongoDB 7.0+ or 8.0+, where the call is either unnecessary or would throw an error. The `sh.shardCollection()` command automatically enables sharding on the database in MongoDB 6.0+, so the explicit `sh.enableSharding()` call was removed.

## Review Notes
- All `sh.*` zone methods used (`sh.addShardToZone`, `sh.removeShardFromZone`, `sh.updateZoneKeyRange`, `sh.removeRangeFromZone`) are the current non-deprecated APIs, correctly replacing the older `sh.addShardTag` / `sh.addTagRange` style methods.
- The config database queries (`config.shards` for zone assignments, `config.tags` for zone key ranges) are correct.
- The tiered storage example leaves data with `year > 2025` unzoned, which is fine — unzoned data goes to any shard. The post could mention this, but it's not an error.
- The balancer methods (`sh.isBalancerRunning()`, `sh.getBalancerState()`, `sh.startBalancer()`) are all correct.
- Zone key range definitions using `MinKey`/`MaxKey` for compound shard keys are correct.
