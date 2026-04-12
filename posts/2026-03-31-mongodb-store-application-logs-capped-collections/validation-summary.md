# Validation Summary: How to Store Application Logs in MongoDB Capped Collections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections, tailable cursors, convertToCapped command)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: cursor.tailable() — https://www.mongodb.com/docs/manual/reference/method/cursor.tailable/
- MongoDB Manual: convertToCapped — https://www.mongodb.com/docs/manual/reference/command/convertToCapped/
- MongoDB Manual: $natural sort — https://www.mongodb.com/docs/manual/reference/operator/meta/natural/
- MongoDB 5.0 Release Notes (capped collection deletion support)

## Issues Found

1. **Incorrect tailable cursor syntax in mongosh example**: The second argument to `db.collection.find()` in mongosh is a projection document, not an options object. Passing `{ tailable: true, awaitData: true }` as the second argument would set those as projection fields, not configure cursor behavior. Fixed to use the correct `db.app_logs.find().tailable({ awaitData: true })` chained method syntax. Also removed `await` from `hasNext()` and `next()` calls since mongosh handles async internally.

2. **Incorrect lock type for convertToCapped**: The post stated the command acquires a "global write lock." Since MongoDB 4.2+, `convertToCapped` acquires an exclusive lock on the parent database, not a global lock. Fixed to say "exclusive lock on the parent database."

3. **Outdated deletion limitation**: The post stated "No document deletion" is allowed in capped collections. Starting in MongoDB 5.0, document deletion IS permitted in capped collections. Updated the limitation to clarify this version-dependent behavior.

4. **Vague/misleading index restriction claim**: The post listed "Index creation is more restricted than regular collections" as a limitation. Capped collections support most index types; the only notable index restriction is TTL indexes, which was already listed as a separate item. Removed this misleading claim to avoid confusion.

## Review Notes
- The `db.collection.stats()` method used in the "Checking Collection Stats" section wraps the `collStats` command, which has been deprecated in favor of the `$collStats` aggregation stage since MongoDB 6.2. It still functions but may be removed in a future version. Not fixed since it remains widely used and functional.
- The Node.js driver tailable cursor example (second code block) is correct — `find()` in the driver does accept `tailable`, `awaitData`, and `noCursorTimeout` as options in the second argument.
