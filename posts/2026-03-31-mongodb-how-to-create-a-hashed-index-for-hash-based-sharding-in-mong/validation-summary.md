# Validation Summary: How to Create a Hashed Index for Hash-Based Sharding in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (hashed indexes, sharding, compound hashed indexes)
- MongoDB Shell (`mongosh`) commands
- MongoDB sharding helpers (`sh.enableSharding`, `sh.shardCollection`, `sh.status`)

## Sources Consulted
- MongoDB Manual: Hashed Indexes — https://www.mongodb.com/docs/manual/core/index-hashed/
- MongoDB Manual: Hashed Sharding — https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Manual: sh.shardCollection() — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Manual: Compound Hashed Indexes — https://www.mongodb.com/docs/manual/core/index-compound/#compound-hashed-indexes
- MongoDB Manual: collStats command — https://www.mongodb.com/docs/manual/reference/command/collStats/

## Issues Found

1. **Floating-point truncation wording (line 126):** The post stated floating point numbers are "rounded to int64 before hashing." MongoDB's documentation specifies they are **truncated** (not rounded) to 64-bit integers. Truncation drops the decimal part (e.g., 1.9 becomes 1), whereas rounding would produce 2 for 1.9. The examples in the post (1.0, 1.5, 1.9 all becoming 1) were consistent with truncation, but the word "rounded" was misleading. Changed "rounded" to "truncated."

2. **Incorrect `collStats` invocation (line 139):** The post used `db.adminCommand({ collStats: "myapp.users" })`. The `collStats` command expects a collection name relative to the current database, not a full namespace. Using `adminCommand` runs against the `admin` database, so `"myapp.users"` would be interpreted as a literal collection name in the admin database rather than the `users` collection in the `myapp` database. Changed to `db.getSiblingDB("myapp").runCommand({ collStats: "users" })`.

## Review Notes
- `sh.enableSharding()` is no longer required starting in MongoDB 6.0 (it became a no-op). The post does not specify a MongoDB version, and the command still works without error, so this is not incorrect — but readers using MongoDB 6.0+ should know it can be omitted.
- The `collStats` command itself was deprecated in MongoDB 6.0 in favor of the `$collStats` aggregation stage. It still functions, but future revisions of this post may want to mention the aggregation alternative.
- All other code examples, shell commands, index creation syntax, sharding workflow, compound hashed index rules (MongoDB 4.4+), and limitation descriptions are accurate.
