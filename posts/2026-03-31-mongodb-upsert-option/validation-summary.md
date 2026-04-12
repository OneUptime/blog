# Validation Summary: How to Use upsert Option in MongoDB Update Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell syntax)
- MongoDB CRUD operations (`updateOne`, `updateMany`, `findOneAndUpdate`)
- MongoDB update operators (`$set`, `$inc`, `$setOnInsert`)
- MongoDB unique indexes

## Sources Consulted
- MongoDB official documentation: db.collection.updateOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB official documentation: db.collection.updateMany() — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB official documentation: db.collection.findOneAndUpdate() — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB official documentation: Upsert Behavior — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/#upsert
- MongoDB official documentation: $setOnInsert — https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB official documentation: $inc — https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB official documentation: Unique Indexes — https://www.mongodb.com/docs/manual/core/index-unique/

## Issues Found
No technical issues found.

## Review Notes
- The mermaid flowchart shows `modifiedCount: 1` for the update path, which assumes the update actually changes data. If the update sets fields to their existing values, `modifiedCount` would be 0 while `matchedCount` remains 1. This is a reasonable simplification for a tutorial and not an error.
- The `findOneAndUpdate` example uses `returnDocument: "after"`, which is the current mongosh syntax. The legacy mongo shell used `returnNewDocument: true`. Since mongosh is the current standard shell, this is correct.
- All code examples use mongosh syntax consistently throughout the post.
