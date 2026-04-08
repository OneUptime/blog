# Validation Summary: How to Convert a Regular Collection to a Capped Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoDB Shell (mongosh)
- Capped Collections
- `convertToCapped` command

## Sources Consulted
- MongoDB `convertToCapped` command documentation: https://www.mongodb.com/docs/manual/reference/command/convertToCapped/
- MongoDB Capped Collections documentation: https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB `db.getCollectionInfos()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/
- MongoDB lock documentation for database commands: https://www.mongodb.com/docs/manual/faq/concurrency/

## Issues Found
1. **`db.events.options()` is not a valid method** (line 50): The post used `db.events.options()` to verify collection options after conversion. This method does not exist in the MongoDB shell. Changed to `db.getCollectionInfos({ name: "events" })`, which returns collection metadata including the `options` field showing capped status and size.

2. **Incorrect lock level described for MongoDB 4.2+** (line 64): The post stated that `convertToCapped` holds a "collection-level lock" on MongoDB 4.2+. According to MongoDB documentation, this command acquires an exclusive database-level lock, not a collection-level lock. Changed "collection-level lock" to "exclusive database-level lock."

3. **Misleading term "overwrites"** (line 22): The post said MongoDB "overwrites the oldest documents in insertion order." MongoDB does not overwrite documents — it removes (deletes) the oldest documents to make room for new inserts. Changed "overwrites" to "automatically removes... to make room for new ones."

## Review Notes
- `db.events.stats()` (used in Step 1) is deprecated since MongoDB 6.2 in favor of the `$collStats` aggregation stage or `db.runCommand({ collStats: "events" })`. It still functions but may be removed in future versions. Left as-is since it still works and the post does not target a specific MongoDB version.
- The `convertToCapped` command itself is noted in MongoDB documentation as potentially being removed in future versions, with the recommendation to create new capped collections directly using `db.createCollection()`. The post already mentions this best practice at the end.
