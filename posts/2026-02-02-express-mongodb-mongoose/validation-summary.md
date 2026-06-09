# Validation Summary: How to Use MongoDB with Express and Mongoose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js
- MongoDB
- Mongoose (ODM)
- bcrypt (for password hashing example)
- dotenv

## Sources Consulted
- Mongoose official documentation: https://mongoosejs.com/docs/
- Mongoose Migrating to 7 guide: https://mongoosejs.com/docs/migrating_to_7.html
- Mongoose Middleware docs: https://mongoosejs.com/docs/middleware.html
- Mongoose Subdocuments docs: https://mongoosejs.com/docs/subdocs.html
- Mongoose Connections docs: https://mongoosejs.com/docs/connections.html
- Mongoose Populate docs: https://mongoosejs.com/docs/populate.html
- MongoDB error codes: https://www.mongodb.com/docs/manual/reference/error-codes/ (code 11000 for duplicate key)
- Express.js documentation: https://expressjs.com/
- bcrypt npm package: https://www.npmjs.com/package/bcrypt

## Issues Found

1. **Deprecated `pre('remove')` middleware on documents** — `Document.prototype.remove()` was removed in Mongoose 7, so the `pre('remove')` document hook no longer fires when deleting documents through modern APIs. Updated the cascading delete example to use `pre('deleteOne', { document: true, query: false }, ...)`, which is the supported modern pattern for document-level pre-delete middleware.

2. **Deprecated subdocument `.remove()` call** — `subdoc.remove()` was removed in Mongoose 7. The example `article.comments.id(req.params.commentId).remove()` would throw in modern Mongoose. Updated it to `article.comments.pull(req.params.commentId)`, which is the idiomatic way to remove a subdocument from an array in current Mongoose versions.

## Review Notes
- Connection options (`maxPoolSize`, `serverSelectionTimeoutMS`, `socketTimeoutMS`) are current and valid for Mongoose 6+ — the obsolete `useNewUrlParser`/`useUnifiedTopology`/`useCreateIndex`/`useFindAndModify` flags are correctly omitted.
- Schema definitions, type references (`mongoose.Schema.Types.ObjectId`, `mongoose.Schema.Types.Mixed`), and validation options (`required`, `match`, `minlength`, `maxlength`, `enum`, `default`, `unique`, `lowercase`, `trim`, `select`, `timestamps`) are all accurate.
- CRUD method usage is correct: `create`, `insertMany` with `ordered: false`, `find` chained with `sort`/`skip`/`limit`/`select`, `findById`, `findByIdAndUpdate` with `new: true, runValidators: true`, and `findByIdAndDelete`.
- Error handling for `error.code === 11000` (duplicate key), `ValidationError`, and `CastError` is correct.
- Population API (`.populate('field', 'selectFields')` and nested populate with `{ path, populate }`) is current.
- Instance methods (`schema.methods`), statics (`schema.statics`), virtuals with `toJSON`/`toObject` virtuals option, and index definitions are all accurate.
- The `bcrypt.hash(password, 12)` call with 12 rounds is a reasonable salt cost and uses the current API.
- The virtual example references `firstName`/`lastName` which aren't in the schema — this is fine as an illustrative snippet, but readers transplanting it should add those fields.
