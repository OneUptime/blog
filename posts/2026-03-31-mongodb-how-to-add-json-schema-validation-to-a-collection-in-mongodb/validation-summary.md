# Validation Summary: How to Add JSON Schema Validation to a Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document validation, `$jsonSchema`)
- JSON Schema (draft 4 with MongoDB extensions)
- MongoDB Shell (`mongosh`)
- Node.js MongoDB Driver (`bypassDocumentValidation` option)

## Sources Consulted
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: `$jsonSchema` operator — https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB Manual: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual: `db.createCollection()` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: `bypassDocumentValidation` — https://www.mongodb.com/docs/manual/reference/command/insert/

## Issues Found
1. **`additionalProperties: false` without `_id` in properties (Step 1)**: The schema in Step 1 used `additionalProperties: false` but did not include `_id` in the `properties` object. MongoDB auto-generates the `_id` field on insert, and when `additionalProperties: false` is set, any field not listed in `properties` is rejected. This means ALL inserts — including the "valid" example in Step 3 — would fail with a validation error. **Fix**: Added `_id: { bsonType: "objectId" }` to the `properties` in the Step 1 schema.

## Review Notes
- The description of `validationLevel: "moderate"` ("New inserts must pass; updates to existing invalid documents are allowed") is a reasonable simplification. The precise behavior is: inserts always validate; updates only validate against documents that already satisfy the validation criteria — documents that were invalid before the rule was added are left alone on update.
- The post states `bypassDocumentValidation` "Requires `dbAdmin` role." This is correct (`dbAdmin` includes the `bypassDocumentValidation` privilege action), though other roles like `dbOwner` and `restore` also grant this privilege. Not changed since the statement is not incorrect.
- All BSON type names, `$jsonSchema` keywords (`minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `enum`, `minItems`, `items`, `required`, `additionalProperties`), and validation options (`validationLevel`, `validationAction`) are accurate.
- The combined `$jsonSchema` + `$expr` pattern in Step 5 is a valid and useful technique for expressing business rules beyond what JSON Schema alone can handle.
