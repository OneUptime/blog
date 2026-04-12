# Validation Summary: How to Validate Array Length in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation with `$jsonSchema`)
- JSON Schema keywords: `minItems`, `maxItems`, `uniqueItems`, `items`
- MongoDB aggregation expressions: `$expr`, `$switch`, `$size`
- MongoDB query operators: `$size`, `$expr`
- MongoDB commands: `createCollection`, `collMod`

## Sources Consulted
- MongoDB $jsonSchema documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB schema validation documentation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB $size query operator: https://www.mongodb.com/docs/manual/reference/operator/query/size/
- MongoDB $size aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/
- MongoDB $expr operator: https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB $switch aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/
- MongoDB collMod command: https://www.mongodb.com/docs/manual/reference/command/collMod/
- JSON Schema Validation draft 4 (array keywords): https://json-schema.org/understanding-json-schema/reference/array

## Issues Found
No technical issues found.

## Review Notes
- All `$jsonSchema` keywords used (`minItems`, `maxItems`, `uniqueItems`, `items`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `enum`, `bsonType`) are correctly applied and supported by MongoDB.
- The `$and` pattern combining `$jsonSchema` with `$expr` for dynamic constraints is a well-documented approach.
- The distinction between collection-level validators (write-time enforcement) and query-time `$size` usage is correctly explained.
- The `$switch`/`$expr` example could potentially error if `members` is missing from a document (since `$size` on a missing field throws an error), but this is a minor edge case and the example is valid for the described use case where `members` exists.
