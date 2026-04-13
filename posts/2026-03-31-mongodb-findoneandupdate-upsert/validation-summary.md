# Validation Summary: How to Use findOneAndUpdate with Upsert in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side behavior of findOneAndUpdate with upsert)
- Node.js MongoDB Driver (v5/v6+ API: `returnDocument`, `includeResultMetadata`)
- Mongoose ODM (`new`, `setDefaultsOnInsert` options)

## Sources Consulted
- MongoDB official documentation: `findOneAndUpdate` — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB official documentation: `$setOnInsert` — https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB official documentation: Upsert behavior — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/#upsert
- MongoDB official documentation: Unique indexes — https://www.mongodb.com/docs/manual/core/index-unique/
- Node.js MongoDB Driver API: `FindOneAndUpdateOptions` — https://mongodb.github.io/node-mongodb-native/
- Mongoose documentation: `findOneAndUpdate` — https://mongoosejs.com/docs/api/model.html#Model.findOneAndUpdate()

## Issues Found
No technical issues found.

## Review Notes
- The `$setOnInsert` block in the "Upsert with Compound Filters" example redundantly includes `date` and `page`, which are already equality conditions in the filter and would automatically be included in any inserted document. This is not incorrect — it is harmless and arguably more explicit — but readers should know the filter equality fields are already applied on insert without `$setOnInsert`.
- The "Creating a Unique Index to Prevent Races" section simplifies the concurrency story slightly. MongoDB's `findOneAndUpdate` with upsert has built-in retry logic: when a unique index violation occurs during the insert phase, the server internally retries the operation as an update. A `DuplicateKeyError` (11000) is only surfaced if all retries fail. The post's advice to catch the error is correct and good defensive practice, but readers should understand that in most cases the retry handles it transparently.
- `setDefaultsOnInsert: true` is the default in Mongoose 6+, so explicitly setting it is redundant on current versions. It remains correct and causes no harm, and is useful for backward compatibility with Mongoose 5.x.
