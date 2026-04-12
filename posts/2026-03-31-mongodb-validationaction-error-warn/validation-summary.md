# Validation Summary: How to Use validationAction (error vs warn) in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (schema validation, `$jsonSchema`, `validationAction`, `validationLevel`)
- MongoDB shell (`mongosh`)
- MongoDB structured logging (JSON log format)
- `collMod` command
- `db.createCollection` with validator options
- `db.getCollectionInfos`

## Sources Consulted
- MongoDB documentation on Schema Validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB documentation on `validationAction`: https://www.mongodb.com/docs/manual/core/schema-validation/handle-invalid-documents/
- MongoDB documentation on `collMod`: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB documentation on `$jsonSchema`: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB documentation on `mongostat`: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB documentation on structured logging: https://www.mongodb.com/docs/manual/reference/log-messages/

## Issues Found
1. **Incorrect mention of `mongostat` for finding validation warnings (line 119)**
   - **What was wrong:** The post stated "Use `mongostat` or parse the MongoDB log for validation warnings." `mongostat` is a real-time statistics monitoring tool that shows server operation counts (inserts/s, queries/s, memory usage, connections, etc.). It does not display log messages or validation warnings.
   - **What was changed:** Removed the `mongostat` reference. The sentence now reads "Parse the MongoDB log for validation warnings:" which accurately describes what the accompanying `grep` command does.
   - **Why:** `mongostat` cannot surface validation warnings; only the MongoDB server log or a log aggregation system can.

## Review Notes
- The error output format shown (with `failingDocumentId`, `details`, `schemaRulesNotSatisfied`) is accurate for MongoDB 5.0+ which introduced detailed validation error information. Earlier versions return a simpler "Document failed validation" error without the structured details. The post does not specify a minimum version, which could confuse users on older MongoDB versions.
- The structured JSON log format (with `"s":"W"`, `"c":"STORAGE"`, `"id":20294`) is accurate for MongoDB 4.4+ which introduced structured logging. The log component and message text are consistent with MongoDB's validation warning behavior.
- The phased rollout strategy (warn+moderate → warn+strict → error+strict) is a sound and commonly recommended approach.
- All `$jsonSchema` syntax, `bsonType` values, and validator options are correct.
