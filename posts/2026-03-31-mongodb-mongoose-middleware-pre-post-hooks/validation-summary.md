# Validation Summary: How to Use Mongoose Middleware (Pre and Post Hooks)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js
- bcryptjs

## Sources Consulted
- Mongoose Middleware documentation: https://mongoosejs.com/docs/middleware.html
- Mongoose 7 migration guide (removal of `Document.prototype.remove()`): https://mongoosejs.com/docs/migrating_to_7.html
- Mongoose 8 documentation: https://mongoosejs.com/docs/api/schema.html

## Issues Found
1. **`remove` referenced as a current document middleware hook (3 occurrences)**: The description, overview, and document middleware section all listed `remove` as a supported document middleware operation. `Document.prototype.remove()` was deprecated in Mongoose 5.x and fully removed in Mongoose 7+. The correct modern equivalent is `deleteOne`. Replaced all three prose references of `remove` with `deleteOne`. Notably, the code examples already used `deleteOne` correctly — only the prose text was outdated.

## Review Notes
- The first `pre('save')` example uses an `async` function but still calls `next()`. This works but is redundant — Mongoose automatically resolves async middleware via the returned promise. Not changed since it is not incorrect, just unnecessary.
- All code examples are syntactically correct and follow current Mongoose patterns.
- The cascading deletes example correctly uses `post('deleteOne', { document: true, query: false })` which is the proper Mongoose 7+/8+ pattern.
- The `insertMany` model middleware signature `function(next, docs)` is correct per Mongoose docs.
