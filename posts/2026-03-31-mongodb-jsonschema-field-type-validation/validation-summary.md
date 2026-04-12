# Validation Summary: How to Validate Field Types with $jsonSchema in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, $jsonSchema)
- BSON types and bsonType keyword
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: Schema Validation with $jsonSchema (https://www.mongodb.com/docs/manual/core/schema-validation/)
- MongoDB official documentation: BSON Types (https://www.mongodb.com/docs/manual/reference/bson-types/)
- MongoDB official documentation: $type query operator (https://www.mongodb.com/docs/manual/reference/operator/query/type/)
- MongoDB official documentation: collMod command (https://www.mongodb.com/docs/manual/reference/command/collMod/)
- mongosh documentation: Data Types (https://www.mongodb.com/docs/mongodb-shell/reference/data-types/)

## Issues Found
- **Incorrect number type in "valid insert" example (line 75):** The example used `quantity: 100`, but in mongosh, bare numeric literals are JavaScript numbers (IEEE 754 doubles), not BSON `int`. Since the schema defines `quantity` with `bsonType: "int"`, this insert would actually fail validation. Fixed by changing to `quantity: NumberInt(100)`, which explicitly creates a 32-bit BSON integer.

## Review Notes
- The supported BSON types list is accurate but not exhaustive — it intentionally shows only "common" types and omits types like `regex`, `timestamp`, `javascript`, and `minKey`/`maxKey`. This is fine for a tutorial focused on field type validation.
- The `decimal` bsonType alias is correct (it maps to BSON type 19, Decimal128).
- The `$type` query operator in the "Checking Existing Documents" section correctly uses the same type alias strings as `bsonType` (e.g., `"double"`, `"bool"`).
- Readers should be aware that `validationAction: "warn"` still inserts the invalid document — it only logs a warning. The post mentions this correctly.
