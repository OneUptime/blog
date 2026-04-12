# Validation Summary: How to Use Mongoose Schema Types and Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js
- JavaScript

## Sources Consulted
- Mongoose SchemaTypes documentation: https://mongoosejs.com/docs/schematypes.html
- Mongoose Validation documentation: https://mongoosejs.com/docs/validation.html
- Mongoose Subdocuments documentation: https://mongoosejs.com/docs/subdocs.html
- Mongoose Document.prototype.validate() API: https://mongoosejs.com/docs/api/document.html#Document.prototype.validate()

## Issues Found
1. **Summary section: "model.validate()" should be "document.validate()"** — In Mongoose terminology, `validate()` is called on a document instance (e.g., `user.validate()`), not on the model constructor (e.g., `User`). The code example in the post correctly uses `user.validate()` on a document instance, but the summary text incorrectly referred to it as `model.validate()`. Changed to `document.validate()`.

## Review Notes
- The post uses `minlength`/`maxlength` (all lowercase) in code examples and summary text. Mongoose accepts both `minlength` and `minLength` (camelCase) in schema definitions, but the official documentation prefers `minLength`/`maxLength` in prose and schema definition examples. Both casings work, so this is not an error, but future updates could align with the docs' preferred camelCase style.
- The `unique` option used on the email field is not a Mongoose validator — it creates a MongoDB unique index. The post does not claim it is a validator, so this is correct as-is, but readers sometimes confuse `unique` with validation.
- `trim` and `lowercase` used in the user schema are SchemaType setters (data transformations), not validators. The post correctly does not list them among built-in validators.
- The available schema types list covers the most common types but omits newer types like UUID, BigInt, Double, Int32, and Union. This is acceptable for a tutorial-level post.
