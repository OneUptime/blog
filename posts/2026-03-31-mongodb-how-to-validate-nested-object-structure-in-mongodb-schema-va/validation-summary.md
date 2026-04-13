# Validation Summary: How to Validate Nested Object Structure in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$jsonSchema` validator
- JSON Schema (Draft 4, as implemented by MongoDB)
- BSON types (string, object, int, decimal, array)

## Sources Consulted
- MongoDB `$jsonSchema` Reference: https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- MongoDB Schema Validation Guide: https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/
- MongoDB `collMod` Command Reference: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB `db.getCollectionInfos()` Reference: https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/

## Issues Found
- **`if`/`then`/`else` keywords not supported in MongoDB's `$jsonSchema`**: The "Conditional Nested Validation" section used `if`/`then`/`else` syntax, which is a JSON Schema Draft 7 feature. MongoDB's `$jsonSchema` is based on Draft 4 and does not support these keywords. Replaced with an equivalent `anyOf` + `not` pattern, which is the idiomatic way to express conditional validation in MongoDB. Added an explanatory note clarifying that `if`/`then`/`else` is not available.

## Review Notes
- All other code examples are syntactically correct and use supported `$jsonSchema` keywords (`bsonType`, `properties`, `required`, `pattern`, `enum`, `minimum`, `items`).
- The `bsonType: "decimal"` usage for Decimal128 is correct.
- The `db.getCollectionInfos()` and `collMod` commands for viewing and updating validators are correct.
- The test cases in "Testing the Validation" correctly demonstrate a passing and failing insert against the defined schema.
