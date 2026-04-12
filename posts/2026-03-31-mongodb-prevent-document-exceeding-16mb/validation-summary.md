# Validation Summary: How to Prevent Document Size from Exceeding 16MB in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (BSON document size limit, schema design patterns)
- MongoDB Aggregation Framework (`$bsonSize`, `$$ROOT`)
- MongoDB GridFS (binary file storage)
- MongoDB JSON Schema Validation (`$jsonSchema`, `maxItems`)
- Node.js MongoDB Driver (`GridFSBucket`)

## Sources Consulted
- MongoDB Documentation: BSON Document Size Limit - https://www.mongodb.com/docs/manual/reference/limits/#bson-document-size
- MongoDB Documentation: `$bsonSize` Aggregation Operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonsize/
- MongoDB Documentation: GridFS - https://www.mongodb.com/docs/manual/core/gridfs/
- MongoDB Documentation: `$jsonSchema` Validation - https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- MongoDB Blog: JSON Schema Validation - Checking Your Arrays - https://www.mongodb.com/blog/post/json-schema-validation--checking-your-arrays
- MongoDB Blog: Paging with the Bucket Pattern - Part 2 - https://www.mongodb.com/blog/post/paging-with-the-bucket-pattern--part-2

## Issues Found
- **Incorrect error message for BSON size limit violation**: The post showed `MongoServerError: Document failed validation: { ... } (BSONObjectTooLarge)`, which conflates MongoDB schema validation errors (error code 121, "Document failed validation") with the BSON size limit error (error code 10334, `BSONObjectTooLarge`). The actual server error message is of the form `BSONObj size: <N> (<hex>) is invalid. Size must be between 0 and 16793600(16MB)`. Fixed the error message to show the accurate server output.

## Review Notes
- All code examples (`$bsonSize` aggregation, Bucket Pattern upsert, GridFS upload, `$jsonSchema` with `maxItems`) are syntactically correct and use current, non-deprecated APIs.
- The `$bsonSize` operator requires MongoDB 4.4+; the post does not mention this version requirement. This is a minor omission but not an error.
- The Bucket Pattern upsert approach has a known caveat with concurrent writes potentially creating multiple new buckets simultaneously, but this is an operational consideration rather than a code error.
- GridFS default chunk size of 255 KB is correctly stated.
