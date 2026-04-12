# Validation Summary: How to Use Zones in MongoDB Sharding for Data Locality

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded cluster, zone sharding)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: Zone Sharding — https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB Manual: sh.addShardToZone() — https://www.mongodb.com/docs/manual/reference/method/sh.addShardToZone/
- MongoDB Manual: sh.updateZoneKeyRange() — https://www.mongodb.com/docs/manual/reference/method/sh.updateZoneKeyRange/
- MongoDB Manual: sh.removeRangeFromZone() — https://www.mongodb.com/docs/manual/reference/method/sh.removeRangeFromZone/
- MongoDB Manual: sh.removeShardFromZone() — https://www.mongodb.com/docs/manual/reference/method/sh.removeShardFromZone/
- MongoDB Manual: sh.enableSharding() — https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB Manual: config.chunks collection — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks

## Issues Found

1. **`sh.enableSharding()` is deprecated** — `sh.enableSharding("myapp")` has been a no-op since MongoDB 6.0 and was removed in MongoDB 8.0. Commented it out and added a note explaining it is no longer required.

2. **Monitoring query used `.collection()` instead of `.getCollection()`** — The mongosh shell does not have a `.collection()` method on database objects. Changed `db.getSiblingDB("config").collection("chunks")` to `db.getSiblingDB("config").getCollection("chunks")`.

3. **Monitoring query referenced non-existent `tag` field on chunks** — The `config.chunks` collection does not have a `tag` field. Zone/tag information is stored in the separate `config.tags` collection. Simplified the aggregation to group by `$shard` only, which correctly shows chunk distribution per shard.

4. **Monitoring query comment said "documents" but counted chunks** — The aggregation counts entries in `config.chunks` (i.e., chunks), not application documents. Changed the comment from "Count documents per shard" to "Count chunks per shard".

## Review Notes
- The `sh.status()` sample output uses the legacy "tag:" label. Modern MongoDB versions (5.0+) display "zone:" instead. This is cosmetic and version-dependent, so it was left as-is.
- The `config.chunks` collection replaced the `ns` field with `uuid` starting in MongoDB 5.0. The monitoring query uses `ns`, which works on older versions but would need adjustment for 5.0+. A version-agnostic approach would involve looking up the collection UUID first, but this adds complexity beyond the scope of this introductory tutorial.
- The `explain()` output path (`plan.executionStats.executionStages.shards?.length`) is approximately correct for sharded explain output but the exact structure can vary across MongoDB versions. Acceptable for a demonstration.
- All zone sharding API methods (`sh.addShardToZone`, `sh.updateZoneKeyRange`, `sh.removeRangeFromZone`, `sh.removeShardFromZone`) are current and correctly used.
- The Node.js driver code is syntactically correct and uses proper async/await patterns.
