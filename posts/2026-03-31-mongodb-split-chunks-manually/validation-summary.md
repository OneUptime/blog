# Validation Summary: How to Split Chunks Manually in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Sharding)
- mongosh shell helpers (`sh.splitAt()`, `sh.splitFind()`, `sh.moveChunk()`)
- MongoDB admin commands (`split`)
- MongoDB config database (`config.chunks`)

## Sources Consulted
- MongoDB official docs: `sh.splitAt()` — https://www.mongodb.com/docs/manual/reference/method/sh.splitat/
- MongoDB official docs: `split` command — https://www.mongodb.com/docs/manual/reference/command/split/
- MongoDB official docs: `sh.splitFind()` — https://www.mongodb.com/docs/manual/reference/method/sh.splitfind/
- MongoDB official docs: Hashed Sharding — https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB official docs: `sh.enableSharding()` — https://www.mongodb.com/docs/manual/reference/method/sh.enablesharding/
- MongoDB official docs: Config Database — https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB JIRA SERVER-53105: Remove namespace field from config.chunks

## Issues Found

1. **Wrong admin command name and syntax**: The post stated `sh.splitAt()` is a wrapper for `splitChunk` and showed an example using `splitChunk` with `from`, `min`, `max`, and `splitKeys` fields. This is incorrect. `sh.splitAt()` wraps the `split` admin command, which uses the `middle` field to specify the split point. `splitChunk` is an internal server command not intended for direct use. Fixed the command name to `split`, corrected the syntax to use `middle`, and updated the description.

2. **Hashed shard key with range-based split points**: The pre-splitting example sharded the collection with `{ customerId: "hashed" }` but then called `sh.splitAt()` with string values like `{ customerId: "C1000" }`. Hashed shard keys store chunk boundaries as NumberLong hash values, and the MongoDB docs explicitly state that `middle` (used by `sh.splitAt()`) should not be used with hashed shard keys — `bounds` with hashed NumberLong values is required instead. Fixed by changing the shard key to a range-based key (`{ customerId: 1 }`), which is consistent with the string-based split points in the example.

3. **False claim about multiple split points**: The original text claimed the admin command form "lets you specify multiple split points in one command." The `split` command handles one split point per invocation. Removed this incorrect claim and replaced with a description of the `find` and `bounds` alternatives.

## Review Notes
- **`config.chunks` `ns` field deprecated**: Starting in MongoDB 5.0, the `ns` field was removed from `config.chunks` and replaced with `uuid`. The post's queries using `{ ns: "myapp.orders" }` will not work on MongoDB 5.0+. A modern approach requires first looking up the collection UUID from `config.collections`, then querying `config.chunks` by `uuid`. The post does not specify a MongoDB version, so this is noted but not changed.
- **`sh.enableSharding()` no longer required**: Starting in MongoDB 6.0, `sh.enableSharding()` is no longer required before sharding a collection. You can call `sh.shardCollection()` directly. The method still works (it explicitly creates the database), so the code is not wrong, but the step is unnecessary on MongoDB 6.0+.
- **Balancer and auto-splitting distinction**: The opening line states "MongoDB's balancer splits and migrates chunks automatically." Strictly speaking, auto-splitting (triggered during inserts when chunk size exceeds the maximum) was historically a separate mechanism from the balancer (which handles migrations). In MongoDB 7.0+, the balancer subsumes more of this functionality. The statement is close enough for a general audience but slightly imprecise.
