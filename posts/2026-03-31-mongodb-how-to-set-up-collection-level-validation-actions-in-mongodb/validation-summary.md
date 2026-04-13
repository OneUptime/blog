# Validation Summary: How to Set Up Collection-Level Validation Actions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, `$jsonSchema`, `validationAction`, `validationLevel`)
- MongoDB Shell (mongosh)
- JSON Schema (as used within MongoDB's `$jsonSchema` operator)

## Sources Consulted
- MongoDB Schema Validation documentation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB $jsonSchema reference: https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/
- MongoDB collMod command reference: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB handling invalid documents: https://www.mongodb.com/docs/manual/core/schema-validation/handle-invalid-documents/
- MongoDB error codes (error 121 DocumentValidationFailure)

## Issues Found

1. **Incorrect `specifiedAs` format in error detail comment (line 87)**: The illustrative error output showed `specifiedAs: 3` (a bare value). MongoDB's actual errInfo structure uses an object: `specifiedAs: { minLength: 3 }`. Fixed to match the documented format.

2. **Incorrect grep string for warn log message (line 127)**: The bash command used `grep "Document failed validation"` to search for warn-level validation log entries. MongoDB logs validation warnings with the message `"Document would fail validation"` (conditional phrasing), not `"Document failed validation"`. Fixed the grep string accordingly.

## Review Notes
- The post does not mention `validationLevel: "off"` as a third option. This is not an error since the post focuses on active validation, but readers should be aware it exists.
- MongoDB 8.1 introduced a third `validationAction` option called `"errorAndLog"`. The post only covers `"error"` and `"warn"`, which is fine for general guidance but may be worth updating in the future.
- The post mixes MongoDB Shell syntax (`db.createCollection()`) with Node.js driver syntax (`await db.collection(...).insertOne()`). While both are valid independently, readers should note these are different execution contexts.
