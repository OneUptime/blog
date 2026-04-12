# Validation Summary: How to Monitor Memory Usage in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- `db.serverStatus()` command
- `mongostat` CLI tool
- `db.collection.stats()` / `collStats`
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: `serverStatus` command (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: WiredTiger cache statistics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger)
- MongoDB official documentation: `mongostat` reference (https://www.mongodb.com/docs/database-tools/mongostat/)
- MongoDB official documentation: `collStats` command (https://www.mongodb.com/docs/manual/reference/command/collStats/)
- MongoDB official documentation: WiredTiger memory use (https://www.mongodb.com/docs/manual/core/wiredtiger/#memory-use)

## Issues Found
1. **Conflicting `mongostat` flags**: The command `mongostat --uri "mongodb://localhost:27017" -n 30 --rowcount 10` used `-n 30` and `--rowcount 10` simultaneously. Since `-n` is the short form of `--rowcount`, this specifies the same option twice with conflicting values (30 vs 10). Fixed to `mongostat --uri "mongodb://localhost:27017" --rowcount 10`, which outputs 10 rows at the default 1-second polling interval.

## Review Notes
- `db.collection.stats()` was deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The method still works but future posts may want to use the aggregation approach instead.
- The `setInterval` loop example works in mongosh but will not work in the legacy `mongo` shell if arrow functions or template literals are used. Since the legacy shell was removed in MongoDB 6.0, this is not a concern for current versions.
- The 5-10% dirty bytes threshold mentioned is consistent with WiredTiger's default `eviction_dirty_target` of 5%, making it reasonable guidance.
- All WiredTiger cache metric field names (`"bytes currently in the cache"`, `"maximum bytes configured"`, `"tracked dirty bytes in the cache"`, `"bytes read into cache"`, `"bytes written from cache"`, `"pages evicted by application threads"`) are correct.
