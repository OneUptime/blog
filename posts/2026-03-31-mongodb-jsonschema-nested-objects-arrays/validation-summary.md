# Validation Summary: How to Validate Nested Objects and Arrays in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$jsonSchema` schema validation
- BSON types (object, array, string, int, double, date, objectId, bool)
- MongoDB shell (mongosh) commands (`db.createCollection`, `insertOne`, `collMod`)

## Sources Consulted
- MongoDB $jsonSchema documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB Schema Validation documentation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB BSON Types documentation: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB collMod command documentation: https://www.mongodb.com/docs/manual/reference/command/collMod/

## Issues Found
1. **Invalid "valid insert" for invoices collection (line 122-123):** The schema defines `quantity` as `bsonType: "int"`, but the insert example used bare JavaScript numbers (`quantity: 5`, `quantity: 2`). In mongosh, bare numbers are stored as BSON `double`, not `int`, so the insert would actually be rejected by validation. Fixed by wrapping values in `NumberInt()` (e.g., `quantity: NumberInt(5)`).

## Review Notes
- The "Checking Validation Details" section mentions "the explain approach" but doesn't actually use an `explain` command. The code shown (changing `validationAction` to `"warn"` and checking logs) is correct, but the phrasing is slightly misleading. Not changed since the code itself is accurate.
- All `$jsonSchema` keywords used (`bsonType`, `required`, `properties`, `items`, `minItems`, `maxItems`, `uniqueItems`, `minimum`, `minLength`, `maxLength`, `pattern`, `enum`, `description`) are supported by MongoDB's implementation.
- The `unitPrice` values (e.g., `9.99`) are correctly bare numbers since they map to `bsonType: "double"`, which matches the default BSON type for JavaScript numbers in mongosh.
