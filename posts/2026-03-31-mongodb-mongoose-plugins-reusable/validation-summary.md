# Validation Summary: How to Use Mongoose Plugins for Reusable Functionality

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- JavaScript / Node.js

## Sources Consulted
- Mongoose Plugins documentation: https://mongoosejs.com/docs/plugins.html
- Mongoose Middleware (pre/post hooks) documentation: https://mongoosejs.com/docs/middleware.html
- Mongoose Schema API (`schema.add`, `schema.methods`, `schema.statics`): https://mongoosejs.com/docs/api/schema.html
- Mongoose Query API (`getQuery`, `where`, `set`): https://mongoosejs.com/docs/api/query.html
- Mongoose `findOneAndUpdate` documentation: https://mongoosejs.com/docs/api/model.html#Model.findOneAndUpdate()

## Issues Found

### Issue 1: `_includeDeleted` flag leaks into MongoDB query
- **What was wrong:** The soft delete pre-find hook checked `this.getQuery()._includeDeleted` to decide whether to skip the soft-delete filter. However, `_includeDeleted` remains in the query object sent to MongoDB. Since no documents have an `_includeDeleted` field, any query using this flag would return zero results.
- **What was changed:** Replaced the `_includeDeleted` check with `this.getQuery().isDeleted == null`, which checks whether the caller already specified an `isDeleted` condition. If `isDeleted` is already in the query, the hook does not add its own filter, allowing explicit queries for deleted documents.
- **Why:** This is a cleaner and more correct pattern — it avoids polluting the MongoDB query with a non-existent field and removes the need for a custom bypass flag entirely.

### Issue 2: `restore` static cannot find soft-deleted documents
- **What was wrong:** The `restore` static used `findByIdAndUpdate(id, ...)`, which triggers the `/^find/` pre-middleware. That middleware adds `isDeleted: false` to the query, but the target document has `isDeleted: true`, so the update never finds the document.
- **What was changed:** Changed `findByIdAndUpdate(id, ...)` to `findOneAndUpdate({ _id: id, isDeleted: true }, ...)`. By explicitly setting `isDeleted: true` in the query, the pre-find hook sees that `isDeleted` is already specified and skips adding its own filter. This allows the restore to find and update the soft-deleted document.
- **Why:** Without this fix, calling `Model.restore(id)` on a soft-deleted document would silently fail (return `null`) because the middleware prevents it from being found.

## Review Notes
- The timestamps plugin's `pre('save')` hook runs on every save including initial creation, slightly overwriting the `updatedAt` default. This is standard behavior and not a bug.
- The timestamps plugin only handles `save` and `findOneAndUpdate` — other update operations like `updateOne` or `updateMany` would not trigger the `updatedAt` update. This is a known limitation but acceptable for a tutorial.
- Mongoose has a built-in `timestamps` option (`new Schema({...}, { timestamps: true })`) that handles this automatically. The custom plugin here is used as an educational example, which is appropriate.
