# Validation Summary: How to Use Enum Validation in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$jsonSchema` validation
- MongoDB `enum` keyword for field value constraints
- MongoDB `collMod` command for updating validators
- MongoDB shell (`mongosh`) commands

## Sources Consulted
- MongoDB $jsonSchema Reference (Available Keywords table): https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- Tips for JSON Schema Validation (null vs missing fields): https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/json-schema-tips/
- Modify Schema Validation (collMod example): https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/
- MongoDB Blog: JSON Schema Validation - Checking Your Arrays (uniqueItems example): https://www.mongodb.com/blog/post/json-schema-validation--checking-your-arrays

## Issues Found
- **"Allowing null in Enum" section conflated null values with absent fields.** The original text stated: "Include `null` in the enum list to allow the field to be absent or null." This is misleading because field absence is controlled solely by the `required` array, not by `null` in `enum`. Including `null` in `enum` only permits the field to have an explicit null value when it is present. Per MongoDB docs: "null field values are not the same as missing fields. If a field is missing from a document, MongoDB does not validate that field." Fixed the text to clarify this distinction.

## Review Notes
- All code examples use correct syntax for `db.createCollection`, `insertOne`, and `db.runCommand` with `collMod`.
- The `enum` keyword, `bsonType`, `items`, `uniqueItems`, `required`, and `description` are all valid `$jsonSchema` keywords supported by MongoDB.
- The error message "MongoServerError: Document failed validation" accurately reflects modern MongoDB driver behavior.
- The `collMod` approach for updating validators is the correct and documented method.
