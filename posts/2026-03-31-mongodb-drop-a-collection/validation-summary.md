# Validation Summary: How to Drop a Collection in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (mongosh shell, server commands)
- mongorestore (MongoDB Database Tools)

## Sources Consulted
- MongoDB Manual: db.collection.drop() — https://www.mongodb.com/docs/manual/reference/method/db.collection.drop/
- MongoDB Manual: drop command — https://www.mongodb.com/docs/manual/reference/command/drop/
- MongoDB Manual: dropDatabase command — https://www.mongodb.com/docs/manual/reference/command/dropDatabase/
- MongoDB Manual: db.getCollectionNames() — https://www.mongodb.com/docs/manual/reference/method/db.getCollectionNames/
- MongoDB Manual: mongorestore — https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Manual: Sharding — https://www.mongodb.com/docs/manual/sharding/

## Issues Found

1. **Description referenced non-existent `dropCollection()` method.** The description claimed the post covers `dropCollection()`, but MongoDB has no such method. The correct methods are `db.collection.drop()` and `db.runCommand({ drop: "..." })`. Fixed the description to reference "the drop command" instead.

2. **Section title "Using dropCollection Command" was incorrect.** The command demonstrated is `db.runCommand({ drop: "myCollection" })`, which is the `drop` command, not `dropCollection`. Renamed the section to "Using the drop Command".

3. **Incorrect `dropDatabase: 0` example in "Dropping a Sharded Collection" section.** The example showed `db.runCommand({ dropDatabase: 0 })` which is incorrect — the valid syntax is `{ dropDatabase: 1 }`. Using `0` is a no-op. Additionally, dropping an entire database is not an alternative to dropping a single sharded collection. The snippet was misleading even with its "Don't use this" comment, as it was introduced with "Alternatively" suggesting it was a valid approach. Removed the entire misleading paragraph.

## Review Notes
- The `mongorestore --db` and `--collection` flags shown in the Recovery section still work but are considered deprecated in MongoDB Database Tools 100.0+ in favor of `--nsInclude`. This is not an error since the flags remain functional, but a future update could modernize these examples.
- The `--oplogLimit` placeholder format `"timestamp:increment"` correctly illustrates the `<seconds>:<ordinal>` format expected by the tool.
- The post correctly notes that `drop()` returns `true`/`false` — this behavior is specific to mongosh; the legacy mongo shell returned a document. Since the post specifies mongosh, this is accurate.
