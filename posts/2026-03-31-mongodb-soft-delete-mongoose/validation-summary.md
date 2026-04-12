# Validation Summary: How to Implement Soft Delete with Mongoose in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- JavaScript (Node.js / CommonJS)

## Sources Consulted
- Mongoose v9.x Middleware documentation — https://mongoosejs.com/docs/middleware.html
- Mongoose v9.x Query API (getOptions, setOptions) — https://mongoosejs.com/docs/api/query.html
- Mongoose v9.x Schema API (add, pre, index, methods, statics) — https://mongoosejs.com/docs/api/schema.html
- Mongoose v9.x Plugins documentation — https://mongoosejs.com/docs/plugins.html

## Issues Found
No technical issues found.

## Review Notes
- All Mongoose APIs used (`getOptions()`, `setOptions()`, `schema.add()`, `schema.pre()` with regex, `pre('countDocuments')`) are valid and current.
- The `setOptions()` / `getOptions()` pattern for passing custom `withDeleted` flags is a well-established community pattern. While custom option keys are not explicitly listed in the Mongoose docs, arbitrary options are preserved and retrievable, making this a reliable approach.
- The `schema.add()` call in the plugin is safe because plugins are applied before model compilation.
- The plugin example is intentionally simplified (omits `restore`, `isDeleted`, `softDeleteMany`, and the `countDocuments` middleware). This is fine for a tutorial but worth noting for readers who copy the plugin verbatim.
- `{ deletedAt: null }` in MongoDB also matches documents where the field does not exist, which provides backward compatibility for pre-existing documents — a helpful implicit behavior for this pattern.
