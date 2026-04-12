# Validation Summary: Mongoose vs Native MongoDB Driver: Which to Choose in Node.js

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- MongoDB
- Mongoose ODM
- MongoDB Node.js native driver (`mongodb` npm package)
- Node.js

## Sources Consulted
- Mongoose official documentation: https://mongoosejs.com/docs/guide.html (Schema definition, strict mode, middleware, populate, lean)
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/ (MongoClient, CRUD, aggregation)
- Mongoose `.lean()` documentation: https://mongoosejs.com/docs/api/query.html#Query.prototype.lean()
- Mongoose middleware documentation: https://mongoosejs.com/docs/middleware.html

## Issues Found

1. **Duplicate `const` declaration in Performance section**: The code block declared `const products` twice — once for the Mongoose `.lean()` example and once for the native driver equivalent. This is a `SyntaxError` in JavaScript since `const` does not allow redeclaration in the same scope. Fixed by renaming the second variable to `results`.

2. **Pre-save middleware sets undeclared `slug` field**: The `pre("save")` hook on `productSchema` set `this.slug`, but the schema definition did not include a `slug` field. With Mongoose's default `strict: true`, this field would be silently stripped on save and never persisted to MongoDB. Fixed by adding `slug: { type: String }` to the schema definition.

## Review Notes
- The "~30-50% faster" performance claim for `.lean()` vs hydrated documents is a commonly cited community benchmark figure, not from official Mongoose documentation. It is a reasonable rough estimate but actual performance differences depend on document size and complexity.
- The sentence "the native driver with `.lean()` (Mongoose) or direct driver usage" in the Performance section is slightly ambiguous — `.lean()` is a Mongoose method, not a native driver feature. The intended meaning (use Mongoose with `.lean()`, or use the native driver directly) is clear enough in context.
- All Mongoose and native driver API usage is current and non-deprecated as of Mongoose 8.x and mongodb driver 6.x.
