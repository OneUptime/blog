# Validation Summary: How to Handle Schema Evolution Without Downtime in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (document model, updateMany, schema validation, aggregation pipeline updates)
- JavaScript / Node.js (MongoDB driver usage)

## Sources Consulted
- MongoDB official documentation for `updateMany`: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB official documentation for aggregation pipeline updates: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/#update-with-aggregation-pipeline
- MongoDB official documentation for schema validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB official documentation for `collMod` and `validationLevel`: https://www.mongodb.com/docs/manual/reference/command/collMod/

## Issues Found

1. **`updateMany` does not support a `limit` option.** The original backfill code passed `{ limit: 1000 }` as an options argument to `updateMany`. MongoDB's `updateMany` has no `limit` option — it silently ignores unknown options and updates all matching documents in a single call. This made the batching loop ineffective. Fixed by using `find().limit(batchSize).toArray()` to fetch a batch of `_id` values, then passing those to `updateMany` with `{ _id: { $in: ids } }` to achieve true batched updates.

2. **Incorrect phase label in rename field example.** The code comment labeled the data migration `updateMany` as "Phase 1: Write both field names," but according to the text's own three-phase description, Phase 1 is a code deployment step (no database command). The `updateMany` that copies the old field to the new field is Phase 2 (migrate data). Fixed the comment to read "Phase 2: Migrate existing data to new field name."

3. **Text referenced `oneOf` but code used `$or`.** The introductory sentence for the schema validation section said the validator uses `oneOf`, which is JSON Schema syntax (`$jsonSchema` with `oneOf`). However, the actual code uses MongoDB's query-based validation with `$or`. Fixed the text to say `$or` to match the code.

## Review Notes
- The aggregation pipeline update syntax (`[{ $set: ... }]` inside `updateMany`) is valid as of MongoDB 4.2+. This is not mentioned in the post, but readers using older MongoDB versions would encounter errors.
- The `validationLevel: "moderate"` usage is correct and well-suited for migrations — it only validates documents that already satisfy the existing validation rules, allowing old-format documents to remain untouched.
- The overall migration strategy advice (additive changes first, multi-phase deploys for renames/removals) aligns with industry best practices.
