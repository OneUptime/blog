# Validation Summary: How to Store and Query Enum Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (JSON Schema validation, `$jsonSchema`, `collMod`, aggregation pipeline)
- Mongoose ODM (schema-level enum validation)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: `$jsonSchema` operator — https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB Manual: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual: `validationLevel` and `validationAction` — https://www.mongodb.com/docs/manual/reference/command/collMod/#std-label-collMod-validationLevel
- MongoDB Manual: Query operators `$in`, `$nin` — https://www.mongodb.com/docs/manual/reference/operator/query/in/
- Mongoose Documentation: SchemaType enum — https://mongoosejs.com/docs/schematypes.html#strings

## Issues Found
- **Incorrect comment about `validationLevel: "moderate"`** (line 59): The inline comment stated `"moderate" = only on insert`, which is incorrect. Per MongoDB documentation, `"moderate"` applies validation to all inserts and to updates on documents that already fulfill the validation criteria. Updates to existing documents that do not currently pass validation are skipped. Fixed the comment to: `"moderate" = skip validation for updates to non-compliant docs`.

## Review Notes
- The "Evolving Enums Safely" section uses a simplified `collMod` validator that only includes the `status` field. In practice, this would replace the entire validator, dropping validation rules for other fields (e.g., `paymentStatus`, `priority`) that were defined earlier in the post. Readers should be aware they need to include the complete validator when using `collMod`. This is a pedagogical simplification rather than a technical error.
- All MongoDB shell commands, query operators, aggregation stages, and Mongoose API usage are correct and current.
- The numeric enum pattern is a valid optimization with the trade-off correctly noted.
