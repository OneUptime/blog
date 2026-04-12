# Validation Summary: How to Validate Data Integrity After Migration in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell)
- MongoDB Aggregation Framework (`$sample`, `$match`, `$group`, `$sum`)
- MongoDB Schema Validation (`$jsonSchema`, `collMod`)
- MongoDB Index Management (`getIndexes`)

## Sources Consulted
- MongoDB `collMod` command documentation: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Schema Validation documentation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB `validationAction` vs `validationLevel`: https://www.mongodb.com/docs/manual/reference/command/collMod/#std-label-collMod-validationAction
- MongoDB `estimatedDocumentCount()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.estimatedDocumentCount/
- MongoDB `$sample` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/
- MongoDB `$jsonSchema` operator: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/

## Issues Found
1. **`validationLevel: "warn"` should be `validationAction: "warn"`** (Step 4, schema validator snippet): The `validationLevel` option accepts `"off"`, `"strict"`, or `"moderate"` — it controls which documents are subject to validation. The value `"warn"` is not valid for `validationLevel`. The post's intent (log warnings instead of rejecting invalid documents) is the behavior of `validationAction: "warn"`. Changed `validationLevel` to `validationAction`.

## Review Notes
- The `estimatedDocumentCount()` method reads from collection metadata and may be slightly inaccurate immediately after a migration (e.g., after unclean shutdowns or certain replication scenarios). The post correctly frames it as a "first and fastest check," which is appropriate. For exact counts, `countDocuments({})` could be noted as a follow-up, but this is a style preference rather than an error.
- The `JSON.stringify` comparison in Step 3 is noted as "simplified," which is fair. In practice, BSON types like `Decimal128` or `Date` may serialize differently depending on context. For production validation, `EJSON.stringify` (available in mongosh) or `tojson()` would preserve BSON type information more faithfully.
- The `sourceDb` and `targetDb` variables in Step 3 are referenced but not defined. The code is illustrative and the pattern is clear, but a production script would need `db.getMongo().getDB("targetDbName")` or separate connection setup.
