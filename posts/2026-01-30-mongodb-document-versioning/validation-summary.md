# Validation Summary: How to Implement MongoDB Document Versioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- MongoDB Node.js Driver
- MongoDB transactions
- MongoDB indexes and TTL indexes
- Mongoose
- JavaScript / Node.js
- deep-diff

## Sources Consulted
- MongoDB Node.js Driver transactions documentation: https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- MongoDB Node.js Driver API documentation for MongoClient and Collection: https://mongodb.github.io/node-mongodb-native/
- MongoDB Manual for `db.collection.findOneAndUpdate()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Manual for TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- Mongoose middleware documentation: https://mongoosejs.com/docs/middleware.html
- deep-diff package documentation: https://www.npmjs.com/package/deep-diff

## Issues Found
- The separate history collection `create()` method returned the transaction callback result but did not return it from the outer method. Updated it to return the result of `session.withTransaction()`.
- The separate history collection `update()` method stored the pre-update document version in history. This made `getVersion()` and point-in-time lookup lag behind the current document and could duplicate version history after creation. Updated it to store the updated document snapshot with the incremented version and update timestamp.
- The diff tracking example stored the old version number for changes. Updated it to store the new version number produced by the update.
- The diff tracking example stored `changes.path` as an array while querying it as if it were a field path value. Updated stored paths to dot-delimited strings and adjusted the change log formatter.
- The diff tracking `update()` method returned `undefined` when there were no differences. Updated it to return the current document for no-op updates.
- The selective restore example opened a transaction and then called `this.update()`, which starts a separate session and transaction. Simplified it to fetch the target version and then call the standard update method directly.
- The restore example saved a duplicate pre-restore history entry for the current version. Removed that duplicate entry and kept the restoration entry for the newly incremented version.
- The Mongoose plugin used `pre('remove')`, which is outdated for current Mongoose deletion middleware. Updated it to document `deleteOne` middleware using `{ document: true, query: false }`.
- The Mongoose section said all User operations were automatically versioned, but Mongoose `save` middleware does not run for update queries such as `findOneAndUpdate()`. Updated the statement to say User save operations are automatically versioned.

## Review Notes
- The examples remain tutorial-level code. For production, the Mongoose plugin should also account for query updates such as `updateOne()` and `findOneAndUpdate()` if those operations are used.
- Multi-document transactions require a MongoDB deployment that supports transactions and the same session must be passed to each operation inside the transaction.
