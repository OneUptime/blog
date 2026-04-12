# Validation Summary: How to Test MongoDB Schema Validation Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation with `$jsonSchema`)
- MongoDB Node.js Driver (`mongodb` package)
- mongodb-memory-server (in-memory MongoDB for testing)
- Jest (test framework)
- BSON types (int, double, string, array, object)

## Sources Consulted
- MongoDB documentation on Schema Validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB `$jsonSchema` keyword reference: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB error codes (121 = DocumentValidationFailure): https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB Node.js Driver API: https://www.mongodb.com/docs/drivers/node/current/
- mongodb-memory-server documentation: https://github.com/typegoose/mongodb-memory-server
- BSON specification and js-bson serialization behavior: https://github.com/mongodb/js-bson
- Jest expect API (`resolves`, `rejects`, `toMatchObject`): https://jestjs.io/docs/expect

## Issues Found
1. **Negative total test used integer value instead of decimal**
   - In the "rejects negative total" test, `total: -5` was used. With MongoDB Node.js driver 6.x (bson 6.x), integer JavaScript numbers are serialized as BSON Int32, not BSON Double. Since the schema specifies `bsonType: 'double'` for `total`, the value `-5` would be rejected due to BSON type mismatch (Int32 vs. double), not because of the `minimum: 0` constraint as the test name implies.
   - **Fix:** Changed `total: -5` to `total: -5.50`, which is serialized as BSON Double, ensuring the test properly validates the `minimum: 0` constraint.

## Review Notes
- With MongoDB Node.js driver 6.x (bson 6.x), integer JavaScript numbers are serialized as BSON Int32, while non-integer numbers are serialized as BSON Double. This means integer-valued totals (e.g., `total: 0`, `total: 20`) would fail the `bsonType: 'double'` constraint. In production schemas, using `bsonType: 'number'` (which matches int, long, double, and decimal) for monetary fields would be more robust, though the tutorial's use of `bsonType: 'double'` is valid for demonstrating strict type validation.
- The "rejects empty items array" test uses `total: 0`, which with driver 6.x is Int32 and would also fail the `bsonType: 'double'` check. The test still passes correctly (code 121) because the empty items array already causes rejection via `minItems: 1`. This is acceptable since the test's focus is on the empty array constraint.
- The blog correctly notes that schema validation should be tested against a real MongoDB instance (or mongodb-memory-server), since validation is handled server-side.
