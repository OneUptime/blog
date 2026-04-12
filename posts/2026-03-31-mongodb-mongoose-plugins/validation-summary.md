# Validation Summary: How to Use Mongoose Plugins

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js
- mongoose-paginate-v2 (community plugin)
- mongoose-autopopulate (community plugin)

## Sources Consulted
- Mongoose Plugins documentation: https://mongoosejs.com/docs/plugins.html
- Mongoose Schema API (`schema.add`, `schema.pre`, `schema.methods`, `schema.statics`, `schema.path`): https://mongoosejs.com/docs/api/schema.html
- Mongoose Query middleware (`pre(/^find/)`, `getFilter()`): https://mongoosejs.com/docs/middleware.html
- Mongoose global plugins (`mongoose.plugin()`): https://mongoosejs.com/docs/plugins.html#global
- mongoose-paginate-v2 npm package: https://www.npmjs.com/package/mongoose-paginate-v2
- mongoose-autopopulate npm package: https://www.npmjs.com/package/mongoose-autopopulate

## Issues Found
- **Typo in Soft Delete Plugin**: Line 65 had `this.getFilter().includDeleted` — missing the letter 'e'. Fixed to `this.getFilter().includeDeleted`. This would have caused the `includeDeleted` flag to never be recognized, meaning the soft-delete bypass mechanism would silently fail.

## Review Notes
- The Soft Delete Plugin uses `getFilter().includeDeleted` to check whether deleted documents should be included. Because `includeDeleted` is set as part of the query filter, it would also be sent to MongoDB as a filter condition on the actual documents. In production code, the flag should be stripped from the filter (e.g., via `delete filter.includeDeleted`) before the query executes. This is acceptable for a simplified tutorial example but worth noting.
- All other code examples (lastModified plugin, pagination plugin, community plugin usage, global plugin registration) are correct and use current, non-deprecated Mongoose APIs.
- The comment "Must be called before defining any models" for `mongoose.plugin()` is accurate — global plugins only apply to schemas created after the call.
