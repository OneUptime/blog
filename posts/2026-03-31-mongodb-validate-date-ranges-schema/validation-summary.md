# Validation Summary: How to Validate Date Ranges in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Schema Validation, `$jsonSchema`, `$expr`)
- BSON Date type
- MongoDB aggregation expressions (`$lt`, `$gte`, `$lte`, `$subtract`)

## Sources Consulted
- MongoDB Schema Validation documentation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB `$jsonSchema` operator: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB `$expr` operator: https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB BSON Types reference: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB aggregation `$subtract` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- MongoDB `db.createCollection()` reference: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct MongoDB syntax and current (non-deprecated) APIs.
- The `$and` pattern combining `$jsonSchema` with `$expr` is the standard approach for cross-field validation and is well-documented.
- Millisecond calculations for duration constraints are correct (15 min = 900,000 ms; 30 days = 2,592,000,000 ms).
- The null-check logic for optional date fields correctly handles both explicit `null` values and missing fields, since `$eq: ["$missingField", null]` evaluates to `true` in MongoDB's `$expr` context.
- The `bsonType: ["date", "null"]` array syntax is valid for specifying multiple acceptable BSON types in `$jsonSchema`.
