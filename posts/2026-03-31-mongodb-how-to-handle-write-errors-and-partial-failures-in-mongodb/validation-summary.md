# Validation Summary: How to Handle Write Errors and Partial Failures in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server-side write error codes and behavior)
- Node.js MongoDB Driver (v4+/v5/v6)
- PyMongo (Python MongoDB driver)
- JavaScript (async/await, error handling)
- Python (exception handling)

## Sources Consulted
- MongoDB Node.js Driver API documentation for `MongoBulkWriteError`, `BulkWriteResult`, `MongoWriteConcernError`, and `WriteError` classes — https://mongodb.github.io/node-mongodb-native/
- MongoDB Server documentation on write errors and error codes — https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB documentation on bulk write operations — https://www.mongodb.com/docs/manual/core/bulk-write-operations/
- MongoDB documentation on write concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- PyMongo documentation on error classes — https://pymongo.readthedocs.io/en/stable/api/pymongo/errors.html

## Issues Found
1. **`err.index` on `MongoBulkWriteError` (ordered bulk write section)**: `MongoBulkWriteError` does not have a direct `index` property. The index of the failed operation is on individual write errors. Changed `err.index` to `err.writeErrors[0].index`.

2. **Legacy `BulkWriteResult` property names (ordered and unordered bulk write sections)**: The code used `err.result.nInserted`, `err.result.nModified`, and `err.result.nDeleted`, which are legacy property names from the MongoDB Node.js driver v3. In the current driver (v4+), `BulkWriteResult` uses `insertedCount`, `modifiedCount`, and `deletedCount`. Additionally, `nDeleted` was never a valid property in any driver version (the v3 property was `nRemoved`). Fixed all three to use the current API names.

3. **Incorrect error name for write concern errors**: The code checked `err.name === "WriteConcernError"`, but the Node.js driver v4+ class is `MongoWriteConcernError`. Changed to `err.name === "MongoWriteConcernError"`.

## Review Notes
- The post does not specify which version of the MongoDB Node.js driver it targets. The fixes assume the current driver (v4+/v5/v6). If readers are using the legacy v3 driver, the old property names would apply, but v3 is end-of-life and should not be targeted in new tutorials.
- The retry pattern in the "Partial Failure Recovery" section is logically sound but treats all non-duplicate-key errors as transient. In practice, some other error codes (e.g., document validation error 121) are also permanent and should not be retried. The pattern works as an illustration but production code should have a more comprehensive classification of retryable vs. non-retryable errors.
- The `instanceof` check (e.g., `err instanceof MongoBulkWriteError`) is generally more robust than string comparison on `err.name`, but the `name` check approach used in the post is acceptable and commonly seen in examples.
