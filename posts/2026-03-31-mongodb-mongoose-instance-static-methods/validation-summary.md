# Validation Summary: How to Use Mongoose Instance Methods and Static Methods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- bcryptjs
- TypeScript (for typing section)

## Sources Consulted
- Mongoose official docs — Instance Methods: https://mongoosejs.com/docs/guide.html#methods
- Mongoose official docs — Statics: https://mongoosejs.com/docs/guide.html#statics
- Mongoose official docs — TypeScript support: https://mongoosejs.com/docs/typescript.html
- bcryptjs npm documentation: https://www.npmjs.com/package/bcryptjs
- Mongoose API docs — Model.countDocuments(): https://mongoosejs.com/docs/api/model.html#Model.countDocuments()

## Issues Found
No technical issues found.

## Review Notes
- The arrow function example comment says `'this' is undefined`, which is a common simplification. More precisely, `this` in an arrow function is lexically scoped from the enclosing context (e.g., `module.exports` in CommonJS, or `undefined` in ES modules), not the document instance. The explanation correctly conveys the practical point that arrow functions should not be used for Mongoose methods.
- The `findAdmins` and `countActive` statics reference an `active` field not defined in the schema. This is fine since Mongoose queries work regardless of schema strictness, and these are illustrative examples separate from the schema definition above. A minor note for readers.
- The `findByEmail` static is marked `async` which is unnecessary since `this.findOne()` already returns a thenable Query, but it is not incorrect — it simply wraps the result in an additional Promise layer.
