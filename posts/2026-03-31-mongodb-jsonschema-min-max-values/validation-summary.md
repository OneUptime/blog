# Validation Summary: How to Set Minimum and Maximum Values in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$jsonSchema` schema validation
- JSON Schema draft 4 (as implemented by MongoDB)
- BSON types (`double`, `int`, `string`, `array`, `object`)

## Sources Consulted
- MongoDB `$jsonSchema` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB schema validation documentation: https://www.mongodb.com/docs/manual/core/schema-validation/
- JSON Schema draft 4 specification (used by MongoDB's `$jsonSchema`): https://datatracker.ietf.org/doc/html/draft-zyp-json-schema-04

## Issues Found
- **`exclusiveMinimum` / `exclusiveMaximum` used as numeric values instead of booleans.** The post used `exclusiveMinimum: 0` (JSON Schema draft 6+ syntax), but MongoDB's `$jsonSchema` implements JSON Schema draft 4, where `exclusiveMinimum` and `exclusiveMaximum` are boolean flags that modify `minimum` and `maximum`. Fixed to use `minimum: 0, exclusiveMinimum: true` with an explanatory note about the draft 4 boolean semantics.

## Review Notes
- The test examples use bare integer literals (e.g., `stock: 0`, `stock: 10`) with `bsonType: "int"` fields. In the current MongoDB Shell (mongosh), integer-looking numbers within Int32 range are stored as Int32 by default, so this works correctly. Users of the legacy `mongo` shell or language drivers should be aware they may need explicit `NumberInt()` wrappers.
- All other keywords (`minimum`, `maximum`, `minLength`, `maxLength`, `minItems`, `maxItems`, `uniqueItems`, `items`, `bsonType`, `required`, `description`) are correctly used per MongoDB's `$jsonSchema` documentation.
- The `createCollection` syntax with `validator` option is correct for MongoDB 3.6+.
