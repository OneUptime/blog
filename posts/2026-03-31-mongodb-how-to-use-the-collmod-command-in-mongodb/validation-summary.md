# Validation Summary: How to Use the collMod Command in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `collMod` command
- MongoDB document validation (`$jsonSchema`)
- MongoDB TTL indexes
- MongoDB hidden indexes
- MongoDB `listCollections` command

## Sources Consulted
- MongoDB official documentation: `collMod` command (https://www.mongodb.com/docs/manual/reference/command/collMod/)
- MongoDB official documentation: Schema Validation (https://www.mongodb.com/docs/manual/core/schema-validation/)
- MongoDB official documentation: TTL Indexes (https://www.mongodb.com/docs/manual/core/index-ttl/)
- MongoDB official documentation: Hidden Indexes (https://www.mongodb.com/docs/manual/core/index-hidden/)
- MongoDB official documentation: `listCollections` command (https://www.mongodb.com/docs/manual/reference/command/listCollections/)

## Issues Found
No technical issues found.

## Review Notes
- The explanation of `validationLevel: "moderate"` is a simplification. Technically, `moderate` applies validation to inserts and to updates on documents that already satisfy the validation criteria — existing non-conforming documents are not validated on update. The post's phrasing ("only validate new and modified documents") is acceptable for a tutorial but omits this nuance.
- Hidden indexes require MongoDB 4.4+. The post does not mention version requirements, which could be noted in a future update.
- Starting from MongoDB 5.1, the `index` option in `collMod` also accepts `keyPattern` as an alternative to `name` for identifying indexes. This is not mentioned but is not an error — using `name` is the standard approach.
