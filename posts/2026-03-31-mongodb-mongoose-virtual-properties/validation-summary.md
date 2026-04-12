# Validation Summary: How to Use Mongoose Virtual Properties

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js
- JavaScript (CommonJS modules)

## Sources Consulted
- Mongoose Virtuals documentation: https://mongoosejs.com/docs/tutorials/virtuals.html
- Mongoose Schema API documentation: https://mongoosejs.com/docs/api/schema.html#Schema.prototype.virtual()
- Mongoose Populate documentation: https://mongoosejs.com/docs/populate.html#populate-virtuals
- Mongoose toJSON/toObject options: https://mongoosejs.com/docs/api/document.html#Document.prototype.toJSON()

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct, current Mongoose APIs compatible with Mongoose 7.x and 8.x.
- The `require('mongoose')` (CommonJS) syntax is used throughout. Mongoose also supports ES module imports, but CommonJS remains the most common convention in Mongoose documentation and tutorials.
- The virtual populate example uses `await` at the top level without an explicit `async` wrapper, which is standard shorthand in tutorial code and works with top-level await in ES modules or inside async functions.
- The post correctly notes that virtuals cannot be queried or indexed, which is an important caveat for readers deciding between virtuals and stored fields.
