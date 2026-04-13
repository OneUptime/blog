# Validation Summary: How to Handle Validation Errors from MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side JSON Schema validation, error code 121)
- Node.js MongoDB driver (`mongodb` package, `MongoServerError`)
- Express.js (route handlers, error middleware)
- Mongoose ODM (schema validators, `ValidationError`)

## Sources Consulted
- MongoDB documentation on schema validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB documentation on `$jsonSchema` operator: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB documentation on validation error details structure (`errInfo`, `schemaRulesNotSatisfied`, `propertiesNotSatisfied`): https://www.mongodb.com/docs/manual/core/schema-validation/handle-validation-errors/
- Node.js MongoDB driver API documentation for `MongoServerError`: https://mongodb.github.io/node-mongodb-native/
- Mongoose validation documentation: https://mongoosejs.com/docs/validation.html
- Express.js error handling documentation: https://expressjs.com/en/guide/error-handling.html

## Issues Found
- **Bug in `propertiesNotSatisfied` parsing**: The code used `Object.entries(error.propertiesNotSatisfied || {})` and destructured as `[prop, propErrors]`, treating `propertiesNotSatisfied` as a plain object. In reality, MongoDB returns `propertiesNotSatisfied` as an **array** of objects, each with a `propertyName` field and a `details` array. Using `Object.entries()` on an array yields numeric indices (0, 1, 2...) as keys instead of the actual field names, so the `field` value in the output would be wrong. Fixed by iterating the array directly with `for...of` and accessing `propError.propertyName` for the field name.

## Review Notes
- The `$jsonSchema` validator options (`bsonType`, `required`, `additionalProperties`, `pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `enum`) are all correct per MongoDB documentation.
- Error code 121 (`DocumentValidationFailure`) is correct.
- `MongoServerError` is the correct class exported by the Node.js MongoDB driver (v4+). The `err.code` and `err.errInfo` properties are the correct way to access validation failure details.
- The `errInfo.details.schemaRulesNotSatisfied` path is accurate for MongoDB 5.0+ detailed validation error reporting.
- The Mongoose section correctly shows that Mongoose validates at the ODM layer before sending to MongoDB, and the error handling pattern (`err.name === 'ValidationError'`, `err.errors` object) is accurate.
- The Express error handling patterns (422 for validation errors, `next(err)` fallthrough, 4-parameter global error handler) are all correct.
