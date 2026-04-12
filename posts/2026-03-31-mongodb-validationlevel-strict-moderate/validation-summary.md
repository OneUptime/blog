# Validation Summary: How to Use validationLevel (strict vs moderate) in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB schema validation (`validationLevel`, `validationAction`)
- MongoDB `$jsonSchema` validator
- MongoDB `collMod` command
- MongoDB `db.createCollection()` and `db.getCollectionInfos()`

## Sources Consulted
- [Specify Validation Level for Existing Documents - MongoDB Docs](https://www.mongodb.com/docs/manual/core/schema-validation/specify-validation-level/)
- [Schema Validation - MongoDB Docs](https://www.mongodb.com/docs/manual/core/schema-validation/)
- [collMod (database command) - MongoDB Docs](https://www.mongodb.com/docs/manual/reference/command/collMod/)
- [View Existing Validation Rules - MongoDB Docs](https://www.mongodb.com/docs/manual/core/schema-validation/view-existing-validation-rules/)
- [db.getCollectionInfos() - MongoDB Docs](https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/)

## Issues Found
- **Incomplete migration script (Step 2):** The query found documents missing `email` OR `username`, but the update only set `email`, leaving documents missing `username` still non-conforming. Fixed to conditionally set both `email` and `username` as needed, so all non-conforming documents are properly repaired before switching to strict mode in Step 3.

## Review Notes
- All core technical claims about `validationLevel` behavior (strict vs moderate vs off) are accurate per official MongoDB documentation.
- The default `validationLevel` being `"strict"` is correctly stated.
- The `collMod` syntax for changing `validationLevel` is correct.
- The behavior of moderate mode (skipping validation on updates to non-conforming documents) is accurately described.
- The `$unset` example correctly demonstrates that strict mode validates the resulting document and rejects updates that would produce an invalid document.
- `db.getCollectionInfos()` is the documented shell helper for viewing validation settings; note that default values for `validationLevel` and `validationAction` may not appear in the output if they were never explicitly set.
