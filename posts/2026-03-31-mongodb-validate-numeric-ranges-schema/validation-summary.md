# Validation Summary: How to Validate Numeric Ranges in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation with `$jsonSchema`)
- JSON Schema Draft 4 (as implemented by MongoDB)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB `$jsonSchema` operator reference: https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- MongoDB blog: JSON Schema Validation and Business Rules in MongoDB 3.6: https://medium.com/mongodb/json-schema-validation-and-business-rules-in-mongodb-3-6-25d3832408e
- MongoDB JIRA SERVER-29579 (exclusiveMinimum must be boolean): https://jira.mongodb.org/browse/SERVER-29579
- JSON Schema Draft 4 exclusiveMinimum specification: https://www.learnjsonschema.com/draft4/validation/exclusiveminimum/
- mongosh data types documentation: https://www.mongodb.com/docs/mongodb-shell/reference/data-types/
- MongoDB collMod command reference: https://docs.mongodb.com/manual/reference/command/collMod/
- MongoDB "Modify Schema Validation" guide: https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/
- MongoDB "Specify Validation With Query Operators": https://www.mongodb.com/docs/manual/core/schema-validation/specify-query-expression-rules/

## Issues Found
1. **`exclusiveMinimum`/`exclusiveMaximum` used as numeric values instead of booleans (Exclusive Boundaries section, first code example):**
   - **What was wrong:** The first code example in the "Exclusive Boundaries" section used `exclusiveMinimum: 0` and `exclusiveMaximum: 100` as standalone numeric bounds (JSON Schema Draft 6+ style). MongoDB's `$jsonSchema` implements JSON Schema Draft 4, where `exclusiveMinimum` and `exclusiveMaximum` are **boolean** values that modify `minimum`/`maximum`. The post's own note immediately after the example correctly stated this, making the code example self-contradictory.
   - **What was changed:** Added `minimum: 0` and `maximum: 100` fields, and changed `exclusiveMinimum` and `exclusiveMaximum` to `true` (boolean) so they correctly modify the accompanying `minimum`/`maximum` constraints.
   - **Why:** Using `exclusiveMinimum: 0` would be interpreted as boolean `false` (since 0 is falsy in JavaScript), making the minimum inclusive — the opposite of the intended behavior. With `exclusiveMaximum: 100`, the value `100` is truthy so it would accidentally work, but only by coincidence and without a `maximum` field to modify, it has no effect. The corrected syntax (`minimum: 0, exclusiveMinimum: true`) properly enforces "strictly greater than 0."

## Review Notes
- The post correctly notes that MongoDB uses JSON Schema Draft 4 semantics for exclusive boundaries, which is an important distinction from Draft 6+ used by many JSON Schema validators outside of MongoDB.
- In mongosh (modern MongoDB Shell), integer literals like `50` are automatically stored as BSON Int32, so the test examples using `quantity: 50` with `bsonType: "int"` are correct for mongosh. However, readers using application drivers (Node.js, Python, Java) should be aware that plain numbers may default to Double in those contexts, potentially failing `bsonType: "int"` validation.
- The `multipleOf: 0.01` pattern for monetary values is technically correct but may encounter floating-point precision issues with certain values. For precise monetary calculations, using `bsonType: "decimal"` (BSON Decimal128) is recommended.
- The cross-field validation pattern using `$and` with `$jsonSchema` and `$expr` is the documented approach and is correctly demonstrated.
