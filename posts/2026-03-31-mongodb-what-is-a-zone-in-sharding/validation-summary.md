# Validation Summary: What Is a Zone in MongoDB Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sharded clusters
- MongoDB zone sharding (formerly tag-aware sharding)
- MongoDB balancer
- `mongosh` shell helpers for zone management

## Sources Consulted
- MongoDB official documentation: Zones — https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB official documentation: sh.addShardToZone() — https://www.mongodb.com/docs/manual/reference/method/sh.addShardToZone/
- MongoDB official documentation: sh.updateZoneKeyRange() — https://www.mongodb.com/docs/manual/reference/method/sh.updateZoneKeyRange/
- MongoDB official documentation: sh.removeRangeFromZone() — https://www.mongodb.com/docs/manual/reference/method/sh.removeRangeFromZone/
- MongoDB official documentation: sh.removeShardFromZone() — https://www.mongodb.com/docs/manual/reference/method/sh.removeShardFromZone/
- MongoDB official documentation: Manage Shard Zones — https://www.mongodb.com/docs/manual/tutorial/manage-shard-zone/

## Issues Found

1. **Deprecated shell helpers used throughout**: The post used `sh.addShardTag()`, `sh.addTagRange()`, `sh.removeTagRange()`, and `sh.removeShardTag()` — all deprecated since MongoDB 3.4 (2016). Replaced with the current equivalents:
   - `sh.addShardTag()` → `sh.addShardToZone()`
   - `sh.addTagRange()` → `sh.updateZoneKeyRange()`
   - `sh.removeTagRange()` → `sh.removeRangeFromZone()` (note: this method does not take a zone name parameter, unlike the deprecated version)
   - `sh.removeShardTag()` → `sh.removeShardFromZone()`

2. **Incorrect balancer behavior claim**: The post stated the balancer "will flag an error" when no shards are assigned to a zone. This is inaccurate — the balancer simply cannot migrate chunks to satisfy the zone constraint and the chunks remain on their current shard. Corrected the description.

3. **Comment text update**: Changed "View all tag ranges" to "View all zone ranges" to match current terminology.

## Review Notes
- The `config.tags` collection reference is still valid for querying zone ranges in current MongoDB versions, even though the shell helper methods were renamed from "tag" to "zone" terminology.
- The advice about hashed shard keys being incompatible with zone ranges is correct and important.
- The compound shard key recommendation `{ region: 1, _id: 1 }` is sound guidance for zone-based routing.
