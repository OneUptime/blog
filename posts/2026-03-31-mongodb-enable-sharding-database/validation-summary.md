# Validation Summary: How to Enable Sharding on a Database and Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded clusters, mongos)
- MongoDB Sharding (shard keys, chunk management, balancer)
- MongoDB Shell (mongosh / legacy mongo shell)

## Sources Consulted
- MongoDB `enableSharding` command documentation: https://www.mongodb.com/docs/manual/reference/command/enablesharding/
- MongoDB `unshardCollection` command documentation: https://www.mongodb.com/docs/manual/reference/command/unshardcollection/
- MongoDB `shardCollection` command documentation: https://www.mongodb.com/docs/manual/reference/command/shardCollection/
- MongoDB Config Database reference (config.chunks schema): https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB JIRA SERVER-53105 (removal of `ns` field from config.chunks): https://jira.mongodb.org/browse/SERVER-53105

## Issues Found
1. **`unshardCollection` version was incorrect (6.0 -> 8.0):** The post stated "MongoDB 6.0+ supports unsharding a collection" and used a `// MongoDB 6.0+` comment. The `unshardCollection` command was actually introduced in MongoDB 8.0. Fixed both the prose and the code comment to say "MongoDB 8.0+".

2. **Missing note about `enableSharding` being optional since 6.0:** The post presented `enableSharding` as a required first step without noting that starting in MongoDB 6.0, this command is no longer required — `shardCollection` automatically enables sharding on the database. Added a note to Step 1 clarifying this.

3. **`config.chunks` queries used deprecated `ns` field:** The post used `{ ns: "ecommerce.orders" }` to query `config.chunks` in both Step 5 and Step 8. Starting in MongoDB 5.0, the `ns` field was removed from `config.chunks` and replaced with `uuid`. Updated both queries to use `uuid` via a lookup from `config.collections`, with comments explaining the version change.

## Review Notes
- The `config.changelog` queries in Step 8 still reference `ns`, which remains valid for that collection. No change was needed there.
- The `config` database is documented as internal, and its schema may change between releases. The recommended way to monitor the balancer programmatically is via `balancerStatus` and `balancerCollectionStatus` commands rather than querying config collections directly.
- The hashed shard key example comment in Step 3 says "creates the index automatically in shardCollection" — this is true but slightly misleading since `shardCollection` auto-creates supporting indexes for all shard key types, not just hashed ones. Left as-is since it's not technically wrong.
- The `explain()` output description in Step 7 references `"winningPlan.stage" === "SINGLE_SHARD"`. In practice, the exact output structure varies by MongoDB version and the explain verbosity level. The general guidance is correct but readers should be aware the exact field path may differ.
