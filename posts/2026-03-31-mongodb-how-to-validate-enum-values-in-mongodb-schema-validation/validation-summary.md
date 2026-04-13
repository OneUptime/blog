# Validation Summary: How to Validate Enum Values in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Schema Validation / `$jsonSchema`)
- JSON Schema (`enum` keyword)
- MongoDB Shell (`mongosh`)

## Sources Consulted
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: `$jsonSchema` operator — https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB Manual: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual: `db.createCollection()` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: `db.getCollectionInfos()` — https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/

## Issues Found
- **Inaccurate description of `validationLevel: "moderate"`**: The comment stated "Only validate new inserts/updates (skip existing documents)", which implies that no existing documents are validated on update. In reality, `moderate` applies validation to inserts **and** to updates on existing documents that already meet the validation criteria — it only skips validation for updates to documents that are already non-compliant. Updated the comment to: "Validate inserts and updates to already-valid documents (skip updates to non-compliant documents)".

## Review Notes
- All `$jsonSchema` syntax (`bsonType`, `enum`, `required`, `description`, `properties`) is correct and current.
- The `null` handling pattern with `bsonType: ["string", "null"]` combined with `enum: ["low", "medium", "high", null]` is correct.
- The `collMod` command for updating validators on existing collections is syntactically correct.
- `db.getCollectionInfos()` is a valid method for inspecting collection validators.
- The post is version-agnostic; all features shown are available from MongoDB 3.6+ (when `$jsonSchema` was introduced) through current versions.
