# Validation Summary: How to Use Upserts in MongoDB to Insert or Update Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side upsert behavior)
- MongoDB Node.js Driver (`updateOne`, `updateMany`, `replaceOne`, `findOne`, `insertOne`)
- JavaScript / Node.js (async/await syntax)

## Sources Consulted
- MongoDB official documentation: db.collection.updateOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB official documentation: Upsert behavior — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/#upsert
- MongoDB official documentation: $setOnInsert — https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB official documentation: $inc behavior on non-existent fields — https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB official documentation: db.collection.replaceOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.replaceOne/
- MongoDB official documentation: db.collection.updateMany() — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB Node.js Driver API: UpdateResult — https://mongodb.github.io/node-mongodb-native/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly covers all key upsert behaviors: atomic insert-or-update, `$setOnInsert` semantics, filter field inclusion in new documents, and the `updateMany()` single-insert caveat.
- The `UpdateResult` properties (`upsertedCount`, `upsertedId`, `matchedCount`) are accurate for the current MongoDB Node.js driver (v5/v6).
- The post could optionally mention that `findOneAndUpdate()` also supports upserts (with `returnDocument: "after"` to get the resulting document), but omitting it is not an error for the scope of this tutorial.
- All code examples use modern async/await syntax and current, non-deprecated APIs.
