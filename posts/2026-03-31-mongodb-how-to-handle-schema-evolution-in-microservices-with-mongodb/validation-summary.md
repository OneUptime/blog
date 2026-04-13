# Validation Summary: How to Handle Schema Evolution in Microservices with MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (Node.js driver)
- MongoDB JSON Schema validation (`$jsonSchema`)
- MongoDB bulk operations (`bulkWrite`)
- MongoDB `collMod` command
- JavaScript (ES6+ async/await, classes, spread operator)

## Sources Consulted
- MongoDB official documentation: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB official documentation: `$jsonSchema` operator — https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB official documentation: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB official documentation: `bulkWrite` — https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/
- MongoDB official documentation: `$unset` operator — https://www.mongodb.com/docs/manual/reference/operator/update/unset/
- MongoDB official documentation: BSON Types — https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB official documentation: `additionalProperties` in JSON Schema — https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#additionalproperties

## Issues Found

1. **`bsonType: 'int'` mismatch with JavaScript numbers (Strategy 3, initial schema)**
   - **What was wrong:** The `schemaVersion` field used `bsonType: 'int'` in the `$jsonSchema` validator. However, all code examples in the post set `schemaVersion` as a plain JavaScript number (e.g., `schemaVersion: 2`), which the MongoDB Node.js driver stores as BSON `double`, not `int`. This would cause schema validation to reject documents written by the application code.
   - **What was changed:** Changed `bsonType: 'int'` to `bsonType: 'number'` in the initial schema validator. The `number` BSON type alias matches `int`, `long`, and `double`, making it compatible with how JavaScript numbers are stored.
   - **Why:** Ensures the validation schema is consistent with the application code shown in the same post.

2. **`bsonType: 'int'` mismatch in tightened schema (Strategy 3, tightened schema)**
   - **What was wrong:** Same `bsonType: 'int'` issue as above in the tightened post-migration schema.
   - **What was changed:** Changed `bsonType: 'int'` to `bsonType: 'number'`.
   - **Why:** Same reason as above — consistency with how the Node.js driver stores JavaScript numbers.

3. **`additionalProperties: false` without `_id` in `properties` (Strategy 3, tightened schema)**
   - **What was wrong:** The tightened schema had `_id` in the `required` array but did not define it in `properties`, while also setting `additionalProperties: false`. MongoDB always includes the `_id` field in documents. With `additionalProperties: false`, any field not in `properties` is disallowed, so every insert/update would fail validation because `_id` would be treated as an undeclared additional property.
   - **What was changed:** Added `_id: { bsonType: 'string' }` to the `properties` object in the tightened schema.
   - **Why:** Prevents validation from rejecting all documents due to the ever-present `_id` field. Used `bsonType: 'string'` to match the string-based `_id` values shown in the post's examples (e.g., `"user-1"`, `"user-2"`).

## Review Notes
- The migration tracker (`trackMigration`) does not handle concurrent execution. If two processes run the same migration simultaneously, both could pass the initial `findOne` check before either sets the status to `running`. This is acceptable for illustrative code, but a production implementation should use `findOneAndUpdate` with `status: { $ne: 'running' }` as a filter to achieve distributed locking.
- The `validationLevel: 'moderate'` comment says "only validate inserted/updated docs." The precise MongoDB behavior is: validates inserts, and validates updates only to documents that already satisfy the validation criteria. Documents that don't currently satisfy validation are left alone on update. This is a minor simplification in the comment, not a code error.
- The `$unset` syntax `{ firstName: '', lastName: '' }` in the contract phase is correct — the value passed to `$unset` is ignored by MongoDB; only the field names matter.
