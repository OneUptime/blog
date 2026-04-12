# Validation Summary: How to Update Schema Validation Rules on an Existing Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, `collMod` command, `$jsonSchema` operator)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: `collMod` command (https://www.mongodb.com/docs/manual/reference/command/collMod/)
- MongoDB official documentation: Schema Validation (https://www.mongodb.com/docs/manual/core/schema-validation/)
- MongoDB official documentation: `$jsonSchema` operator (https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/)
- MongoDB official documentation: `db.getCollectionInfos()` (https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/)
- MongoDB official documentation: Modify Schema Validation (https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/)

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct syntax and current (non-deprecated) APIs.
- The `collMod` replacement behavior (not merge) is correctly described — when updating a validator, the entire validator must be re-specified.
- The safe migration workflow (moderate/warn -> update validator -> backfill -> verify -> strict/error) is a sound and well-documented pattern.
- Setting `validationLevel` and `validationAction` independently from `validator` in a `collMod` call is valid — the existing validator rules are preserved when omitted.
- All `$jsonSchema` keywords used (`bsonType`, `required`, `properties`, `pattern`, `minLength`, `maxLength`, `enum`) are supported by MongoDB's JSON Schema implementation (based on JSON Schema draft 4).
- Minor omission: MongoDB 8.1+ introduced a third `validationAction` value (`"errorAndLog"`), but this is very recent and not relevant to the workflows described in the post.
