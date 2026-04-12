# Validation Summary: How to Tag-Aware Sharding in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded clusters, zone sharding)
- mongos shell helpers (`sh.addShardToZone`, `sh.updateZoneKeyRange`, etc.)
- MongoDB config database (`config.shards`, `config.tags`)

## Sources Consulted
- MongoDB Manual: Zone Sharding — https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB Manual: sh.addShardToZone() — https://www.mongodb.com/docs/manual/reference/method/sh.addShardToZone/
- MongoDB Manual: sh.updateZoneKeyRange() — https://www.mongodb.com/docs/manual/reference/method/sh.updateZoneKeyRange/
- MongoDB Manual: sh.removeRangeFromZone() — https://www.mongodb.com/docs/manual/reference/method/sh.removeRangeFromZone/
- MongoDB Manual: sh.removeShardFromZone() — https://www.mongodb.com/docs/manual/reference/method/sh.removeShardFromZone/
- MongoDB Manual: enableSharding command deprecation — https://www.mongodb.com/docs/manual/reference/command/enableSharding/
- MongoDB Manual: shardCollection — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/

## Issues Found

1. **Deprecated shell helpers used throughout**: The post used `sh.addShardTag()`, `sh.addTagRange()`, `sh.removeTagRange()`, and `sh.removeShardTag()` — all deprecated since MongoDB 3.4 and removed in MongoDB 6.0. Replaced with the modern zone-based equivalents: `sh.addShardToZone()`, `sh.updateZoneKeyRange()`, `sh.removeRangeFromZone()`, and `sh.removeShardFromZone()`.

2. **`enableSharding` command removed in modern MongoDB**: The `db.adminCommand({ enableSharding: "analytics" })` command became a no-op in MongoDB 6.0 and was removed in MongoDB 8.0. Removed the command and replaced `db.adminCommand({ shardCollection: ... })` with `sh.shardCollection()`, which automatically handles database sharding enablement.

3. **`config.chunks` ns field no longer exists in MongoDB 6.0+**: The `config.chunks` collection uses `uuid` instead of `ns` in MongoDB 6.0+. The query `db.chunks.find({ ns: "analytics.events" })` would fail on modern MongoDB. Replaced with `db.events.getShardDistribution()` and `sh.status()` which work across all versions.

4. **Over-inclusive multi-tenant range bounds**: The multi-tenant example used `"A\uffff"` and `"B\uffff"` as upper bounds for tenant IDs, which would match not just tenantId "A" but also "AA", "AB", "ABC", etc. Fixed to use exact tenantId match with `{ tenantId: "A", _id: MaxKey }` as the upper bound.

5. **Summary section referenced deprecated methods**: Updated `sh.addShardTag()` and `sh.addTagRange()` references to `sh.addShardToZone()` and `sh.updateZoneKeyRange()`.

## Review Notes
- The `config.tags` collection name and document structure shown in Step 4 remain correct for MongoDB 6.0+ — zone ranges are still stored in `config.tags` with `ns`, `min`, `max`, and `tag` fields.
- The `_id` structure shown in the expected output (`{ ns: ..., min: ... }`) is accurate for the `config.tags` collection.
- The `removeRangeFromZone()` method does not take a zone/tag parameter (unlike the deprecated `removeTagRange()` which did) — the range alone uniquely identifies what to remove.
