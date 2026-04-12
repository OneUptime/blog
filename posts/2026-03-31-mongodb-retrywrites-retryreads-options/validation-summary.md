# Validation Summary: How to Use the retryWrites and retryReads Options in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (server and connection string options)
- MongoDB Node.js Driver
- PyMongo (Python MongoDB Driver)
- MongoDB Atlas (connection string format)

## Sources Consulted
- MongoDB Retryable Writes Specification: https://github.com/mongodb/specifications/blob/master/source/retryable-writes/retryable-writes.md
- MongoDB Retryable Writes Documentation: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Retryable Reads Specification: https://github.com/mongodb/specifications/blob/master/source/retryable-reads/retryable-reads.md
- MongoDB Retryable Reads Documentation: https://www.mongodb.com/docs/manual/core/retryable-reads/
- MongoDB Node.js Driver Documentation: https://www.mongodb.com/docs/drivers/node/current/
- PyMongo Documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html

## Issues Found

### 1. `insertMany` incorrectly listed as NOT covered by retryWrites
- **What was wrong:** The post listed `insertMany (unordered)` under the "NOT covered" section of retryWrites. Per the MongoDB retryable writes specification, `insertMany` (both ordered and unordered) IS a supported retryable write operation. The driver retries individual write operations within the batch.
- **What was changed:** Moved `insertMany` to the "Covered" section alongside `insertOne`.
- **Why:** The MongoDB specification explicitly states that `insertMany` is retryable and that "The ordered option may be true or false." Both variants are supported.

### 2. `bulkWrite` description was misleading
- **What was wrong:** `bulkWrite` was described as `bulkWrite (ordered, single-batch)`, implying only ordered single-batch bulk writes are retryable. Per the spec, `bulkWrite` is retryable for both ordered and unordered execution, as long as it contains no `updateMany` or `deleteMany` operations.
- **What was changed:** Updated to `bulkWrite (when containing only single-document write operations)`.
- **Why:** The MongoDB specification states bulk writes are retryable if they do not contain any multi:true writes (updateMany/deleteMany), regardless of ordered/unordered.

## Review Notes
- The `count` method listed under retryReads is deprecated since MongoDB 4.0 in favor of `countDocuments` and `estimatedDocumentCount`. Both replacements are retryable. The post correctly lists `countDocuments` but does not mention `estimatedDocumentCount`. This is a minor omission, not an error.
- The retryReads list omits `listIndexes` and `watch()` (change streams), which are also retryable per the specification. The list is illustrative rather than exhaustive, so this is acceptable.
- The `socketTimeoutMS` option shown in the timeout configuration example is a valid connection option but has been soft-deprecated in newer driver versions in favor of `timeoutMS` (the unified client-side operation timeout). This is not incorrect for current driver versions but may become outdated.
- All code examples (Node.js and PyMongo) use correct syntax and current APIs.
- Connection string formats are correct for both standard and SRV connection strings.
