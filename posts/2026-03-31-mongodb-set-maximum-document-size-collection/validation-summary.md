# Validation Summary: How to Set Maximum Document Size for a Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.4+)
- MongoDB Schema Validation (`$jsonSchema`, `$expr`)
- MongoDB Aggregation Framework (`$bsonSize`, `$project`, `$match`)
- MongoDB `collMod` command

## Sources Consulted
- MongoDB documentation on BSON document size limit (https://www.mongodb.com/docs/manual/reference/limits/#bson-document-size)
- MongoDB documentation on `$bsonSize` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/)
- MongoDB documentation on schema validation (https://www.mongodb.com/docs/manual/core/schema-validation/)
- MongoDB documentation on `$expr` operator (https://www.mongodb.com/docs/manual/reference/operator/query/expr/)
- MongoDB documentation on `collMod` command (https://www.mongodb.com/docs/manual/reference/command/collMod/)
- MongoDB documentation on `$jsonSchema` (https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/)

## Issues Found
No technical issues found.

## Review Notes
- The `$bsonSize` operator was introduced in MongoDB 4.4. The post does not mention this version requirement. All code examples require MongoDB 4.4 or later to work. This is a minor omission, not an error, since MongoDB 4.4 is well past end-of-life support and most deployments run newer versions.
- All code examples are syntactically correct and use current, non-deprecated APIs.
- The approach of combining `$jsonSchema` with `$expr` / `$bsonSize` in a `$and` validator is a well-established pattern for enforcing custom document size limits.
