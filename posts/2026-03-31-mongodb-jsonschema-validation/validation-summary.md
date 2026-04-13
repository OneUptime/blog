# Validation Summary: How to Perform Schema Validation in MongoDB with $jsonSchema

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation with `$jsonSchema`)
- BSON types
- mongosh (MongoDB Shell)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: `$jsonSchema` operator — https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB Manual: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual: BSON Types — https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB Manual: `db.createCollection()` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Node.js Driver documentation — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
1. **`qty: 2` should be `NumberInt(2)` in mongosh examples.** In mongosh (and the legacy mongo shell), plain numeric literals like `2` are JavaScript numbers, which are IEEE 754 doubles. When sent to MongoDB, they are stored as BSON `double` type. Since the schema defines `qty` with `bsonType: "int"` (32-bit integer), inserts using `qty: 2` would fail validation with a bsonType mismatch. Fixed all three insert examples (the valid insert, and the invalid enum insert) to use `NumberInt(2)` instead of `2`.

## Review Notes
- The `title` keyword in `$jsonSchema` was introduced in MongoDB 5.1. The post does not mention a minimum version, which is fine since MongoDB 5.x+ is current, but readers on older versions should be aware.
- The best practices section correctly recommends `bsonType: "decimal"` for financial data, yet the example schema uses `bsonType: "double"` for `price` and `total`. This is intentional as a teaching example but could confuse readers who follow both sections. A future revision could add an inline note.
- Error code 121 (`DocumentValidationFailure`) is correctly referenced in the Node.js example.
- The `additionalProperties: false` usage correctly includes `_id` in the `properties` block, which is necessary to prevent auto-generated `_id` from being rejected.
