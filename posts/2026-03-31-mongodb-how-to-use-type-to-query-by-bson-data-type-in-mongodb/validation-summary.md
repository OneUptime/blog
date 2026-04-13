# Validation Summary: How to Use $type to Query by BSON Data Type in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB `$type` query operator
- BSON data types and type codes
- MongoDB Node.js driver
- PyMongo (Python MongoDB driver)
- MongoDB `$jsonSchema` validation with `bsonType`
- MongoDB aggregation framework `$type` expression operator

## Sources Consulted
- MongoDB official documentation: `$type` query operator — https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB official documentation: BSON types — https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB official documentation: `$type` aggregation expression — https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/
- MongoDB official documentation: `$jsonSchema` — https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB official documentation: Schema validation — https://www.mongodb.com/docs/manual/core/schema-validation/

## Issues Found
No technical issues found.

## Review Notes
- The BSON type reference table is accurate but intentionally non-exhaustive — it omits less common types like Binary Data (5), Undefined (6), JavaScript (13), Symbol (14), JavaScript with Scope (15), MinKey (-1), and MaxKey (127). This is reasonable for a focused tutorial.
- The schema validation section header says "Combine `$type` with `$jsonSchema`" but the code uses `$jsonSchema`'s own `bsonType` keyword rather than the `$type` query operator. While conceptually related, these are technically different mechanisms. The code itself is correct — `bsonType: 'number'` works in `$jsonSchema` and matches all numeric types.
- The aggregation example correctly shows that the `$type` expression operator returns the specific BSON type name (e.g., `"double"`) rather than the `"number"` alias, which is accurate behavior.
- The `"number"` alias (matching int, long, double, and decimal) was introduced in MongoDB 3.4. The post does not mention this version requirement, which could matter for users on very old MongoDB versions.
