# Validation Summary: How to Remove a Shard from a MongoDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded clusters)
- `removeShard` admin command
- `movePrimary` admin command
- `clearJumboFlag` admin command
- `sh.status()` and `sh.startBalancer()` shell helpers
- `config` database collections (`shards`, `chunks`, `changelog`)

## Sources Consulted
- MongoDB `removeShard` command reference: https://www.mongodb.com/docs/manual/reference/command/removeshard/
- MongoDB `movePrimary` command reference: https://www.mongodb.com/docs/manual/reference/command/moveprimary/
- MongoDB `clearJumboFlag` command reference: https://www.mongodb.com/docs/manual/reference/command/clearjumboflag/
- MongoDB Clear Jumbo Flag tutorial: https://www.mongodb.com/docs/manual/tutorial/clear-jumbo-flag/
- MongoDB `sh.startBalancer()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.startbalancer/
- MongoDB Config Database reference: https://www.mongodb.com/docs/manual/reference/config-database/

## Issues Found
1. **Jumbo chunk clearing method was incorrect.** The post originally recommended directly manipulating `config.chunks` documents with `$unset: { jumbo: "" }` to clear jumbo flags. This is an undocumented approach that directly modifies internal config database documents, which is discouraged. Replaced with the official `clearJumboFlag` admin command (available since MongoDB 4.2.3/4.0.15), which is the supported way to clear jumbo flags.

## Review Notes
- Starting in MongoDB 8.0, the `removeShard` response includes an additional `collectionsToMove` field in the `remaining` object, and `sh.moveCollection()` is recommended before using `movePrimary`. The post's approach is correct for pre-8.0 and still functional in 8.0+, but readers on MongoDB 8.0+ should be aware of the newer workflow.
- Starting in MongoDB 7.0, calling `sh.startBalancer()` also enables the AutoMerger for the sharded cluster.
- All other commands, syntax, response formats, and technical claims in the post are accurate and verified against official MongoDB documentation.
