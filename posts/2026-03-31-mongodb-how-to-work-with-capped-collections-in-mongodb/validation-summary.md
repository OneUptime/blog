# Validation Summary: How to Work with Capped Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections, tailable cursors, `createCollection`, `convertToCapped`)
- JavaScript / Node.js (MongoDB Node.js driver)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation on capped collections: https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB official documentation on `convertToCapped`: https://www.mongodb.com/docs/manual/reference/command/convertToCapped/
- MongoDB official documentation on tailable cursors: https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB Node.js driver documentation on `find()` options: https://www.mongodb.com/docs/drivers/node/current/
- Cross-referenced with other validated capped collection posts in this blog repository

## Issues Found
1. **Deletion restriction outdated**: The post stated that document deletions are not allowed on capped collections. Starting in MongoDB 5.0, individual deletes (`deleteOne`, `deleteMany`) are permitted on capped collections. Updated the key characteristics list and the limitations section to note the version boundary.
2. **convertToCapped lock scope incorrect**: The post stated that `convertToCapped` acquires a "global write lock." It actually acquires a database-level exclusive lock, not a global lock. Corrected to "database-level exclusive lock."
3. **Tailable cursor mongosh syntax incorrect**: The first tailable cursor example passed `{ tailable: true, awaitData: true, noCursorTimeout: true }` as the second parameter to `db.collection.find()` in mongosh. In mongosh, the second parameter to `find()` is the projection, not cursor options. Fixed to use the correct chained cursor methods: `.tailable({ awaitData: true }).noCursorTimeout()`.
4. **Misleading time-based retention comment**: The practical use case comment said "create collection for last 7 days of logs," implying time-based retention. Capped collections are size-based, not time-based — actual retention depends on write volume. Changed to "create a capped collection for recent logs."

## Review Notes
- The `db.collection.stats()` method still works in mongosh but may show deprecation warnings in newer versions. The `$collStats` aggregation stage or `db.runCommand({ collStats: "collectionName" })` are the modern alternatives. Not changed since `stats()` still functions.
- The update size restriction (updates that increase document size may fail) is noted in the post. This restriction remains in effect in current MongoDB versions for capped collections.
- TTL index and sharding restrictions on capped collections remain accurate and unchanged in current MongoDB versions.
