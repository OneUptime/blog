# Validation Summary: How to Enforce Data Integrity with Schema Validation in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- MongoDB schema validation
- MongoDB JSON Schema validation
- BSON types
- mongosh commands

## Sources Consulted
- MongoDB Manual: Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: Specify JSON Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/
- MongoDB Manual: $jsonSchema query predicate operator - https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- MongoDB Manual: Specify Validation Level for Existing Documents - https://www.mongodb.com/docs/manual/core/schema-validation/specify-validation-level/
- MongoDB Manual: Choose How to Handle Invalid Documents - https://www.mongodb.com/docs/manual/core/schema-validation/handle-invalid-documents/
- MongoDB Manual: collMod database command - https://www.mongodb.com/docs/manual/reference/command/collmod/
- MongoDB Manual: db.createCollection() - https://www.mongodb.com/docs/manual/reference/method/db.createcollection/
- MongoDB Manual: BSON Types - https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB Manual: View Existing Validation Rules - https://www.mongodb.com/docs/manual/core/schema-validation/view-existing-validation-rules/

## Issues Found
- The numeric constraints example used `exclusiveMaximum: 1`. MongoDB supports JSON Schema draft 4 semantics, where `exclusiveMaximum` is a boolean and the boundary value is specified with `maximum`. Changed the example to `maximum: 1, exclusiveMaximum: true`.

## Review Notes
- The post is technically relevant and contains implementation examples.
- MongoDB 8.1 adds `validationAction: "errorAndLog"`, but the post's `error` and `warn` examples remain valid and current.
- The log-inspection example using `getLog` may require appropriate privileges and is deployment-dependent, but the command itself is valid.
