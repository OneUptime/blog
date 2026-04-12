# Validation Summary: How to Use Mongoose Pre and Post Middleware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js
- bcrypt (password hashing)

## Sources Consulted
- Mongoose Middleware documentation: https://mongoosejs.com/docs/middleware.html
- Mongoose API docs for `Model.findById()`: https://mongoosejs.com/docs/api/model.html#Model.findById()
- Mongoose Schema API (pre/post hook registration): https://mongoosejs.com/docs/api/schema.html#Schema.prototype.pre()

## Issues Found

1. **Incorrect claim about `/^find/` regex matching `findById`** (line 80): The post stated the regex `/^find/` matches `findById`. However, `findById` is not a middleware hook name in Mongoose — it is a convenience method that internally delegates to `findOne`. The regex matches actual hook names like `find`, `findOne`, `findOneAndDelete`, `findOneAndUpdate`, etc. Fixed by replacing `findById` with `findOneAndDelete` in the list and adding a note that `findById` queries are covered because they use `findOne` internally.

2. **Text said "pre-remove hook" but code used `pre('deleteOne')`** (line 84): The introductory text for the Cascading Deletes section said "Use a pre-remove hook" while the actual code correctly used `pre('deleteOne', { document: true })`. The `remove()` method was deprecated and removed in Mongoose 7. Fixed the text to say "pre-deleteOne hook" to match the code.

## Review Notes
- The pre-save and error-handling examples use `async function(next)` and call `next()` explicitly. In async pre middleware, calling `next()` is optional since Mongoose automatically waits for the promise to resolve. The code still works correctly — it is just mixing callback and promise styles. Not changed since it is functional and a common pattern in tutorials.
- The post-save welcome email example would fire on every save, not just initial creation. This is a logic concern for a real application but is acceptable as a demonstration of the post-save hook mechanism.
