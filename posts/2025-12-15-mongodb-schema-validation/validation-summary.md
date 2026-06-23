# Validation Summary: How to Use MongoDB Schema Validation

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- MongoDB schema validation
- MongoDB JSON Schema (`$jsonSchema`)
- MongoDB query validators and `$expr`
- MongoDB `createCollection` and `collMod`
- MongoDB Node.js driver
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual: Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: `$jsonSchema` query predicate operator and supported keywords - https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- MongoDB Manual: `create` database command validation options - https://www.mongodb.com/docs/manual/reference/command/create/
- MongoDB Manual: `collMod` database command validation options - https://www.mongodb.com/docs/manual/reference/command/collmod/
- MongoDB Manual: Modify Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/
- MongoDB Manual: Query for and Modify Valid or Invalid Documents - https://www.mongodb.com/docs/manual/core/schema-validation/use-json-schema-query-conditions/
- MongoDB Manual: Tips for JSON Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/json-schema-tips/
- MongoDB Node.js Driver: Databases and Collections - https://www.mongodb.com/docs/drivers/node/current/databases-collections/

## Issues Found
- The post stated that MongoDB schema validation uses JSON Schema only. MongoDB validators can use `$jsonSchema` and supported query expressions, so the wording was updated to reflect both validation mechanisms.
- The conditional validation example used JSON Schema keywords `if`, `then`, and `const`. MongoDB supports draft 4 JSON Schema with documented omissions and does not list those newer keywords as supported. The example was replaced with an equivalent validator using `$and`, `$or`, `$ne`, `$type`, and `$regex`, which are supported in MongoDB validators.
- The `validationLevel: "moderate"` comment was imprecise. It now states that MongoDB validates inserts and updates to existing valid documents, while updates to existing invalid documents are not validated.

## Review Notes
The remaining examples use documented MongoDB validation options and Node.js driver APIs. Some snippets are illustrative and create collections with the same name in separate examples; readers running the examples sequentially would need to drop or rename existing collections first.
