# Validation Summary: How to Use $jsonSchema for Runtime Document Validation in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB $jsonSchema validator
- MongoDB collection validation (validationLevel, validationAction)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- MongoDB shell commands

## Sources Consulted
- MongoDB $jsonSchema documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB Schema Validation documentation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB collMod command documentation: https://www.mongodb.com/docs/manual/reference/command/collMod/
- JSON Schema Draft 4 specification (exclusiveMinimum/exclusiveMaximum are boolean, not numeric)
- MongoDB Node.js driver error handling documentation
- PyMongo create_collection and WriteError documentation

## Issues Found

1. **`exclusiveMinimum` used as numeric value instead of boolean** — In the "Nested Objects" code example, `exclusiveMinimum: 0` was used for width, height, and depth fields. MongoDB's `$jsonSchema` follows JSON Schema Draft 4, where `exclusiveMinimum` is a boolean that modifies the `minimum` keyword, not a standalone numeric threshold (that is the Draft 6+ behavior). Fixed to `minimum: 0, exclusiveMinimum: true`.

2. **Incorrect error class name in summary** — The summary stated "Handle `MongoWriteConcernError` with code `121`". Document validation failures produce a `MongoServerError` with code 121, not a `MongoWriteConcernError`. Write concern errors relate to replication acknowledgment, not schema validation. Fixed to `MongoServerError`.

## Review Notes
- The inline comment for `validationLevel: 'moderate'` ("only validate new writes, not existing docs") is a simplification. The table description is more precise: moderate validates inserts and updates to documents that already satisfy the validation criteria, but skips validation for updates to pre-existing documents that don't match. The simplification is acceptable for an inline comment.
- The JavaScript code uses top-level `await` with CommonJS `require()` syntax. Top-level await requires ES modules in Node.js. This is a common tutorial convention (implying the code runs inside an async function) and is not treated as an error.
- The `title` keyword in `$jsonSchema` is supported starting in MongoDB 5.1. The post doesn't specify a minimum MongoDB version, which is fine since 5.1+ is broadly current.
