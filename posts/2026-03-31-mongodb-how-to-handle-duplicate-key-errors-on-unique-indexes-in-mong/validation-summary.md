# Validation Summary: How to Handle Duplicate Key Errors on Unique Indexes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (E11000 duplicate key error, unique indexes, aggregation pipeline)
- Node.js MongoDB Driver (v4+/v6+)
- Python pymongo driver
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB documentation on unique indexes: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB documentation on write errors and error codes: https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB Node.js Driver API reference for `insertOne`, `insertMany`, `updateOne`: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Node.js Driver `MongoBulkWriteError` class: https://mongodb.github.io/node-mongodb-native/6.0/classes/MongoBulkWriteError.html
- pymongo `DuplicateKeyError` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/errors.html
- MongoDB `$setOnInsert` operator: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/

## Issues Found
- **Outdated error class name in bulk write error handling**: The code checked `error.name === "BulkWriteError"`, which is the class name from the MongoDB Node.js driver v3 and earlier. In the current driver (v4+), the class was renamed to `MongoBulkWriteError`. Changed to `error.name === "MongoBulkWriteError"` for accuracy with current driver versions. The code still functioned because the OR condition with `error.code === 11000` would catch the error, but the name check was misleading for readers using the current driver.

## Review Notes
- The post correctly warns about the race condition in the check-then-insert pattern and recommends upsert as the atomic alternative.
- The aggregation pipeline for finding duplicates is correct and uses `$slice` properly to skip the first occurrence (keeping it) and return the rest for removal.
- The `MongoServerError` import in the Node.js section is unused in the code example but is reasonable context for readers who may want to use `instanceof` checks.
- The pymongo `DuplicateKeyError.details.keyValue` field requires MongoDB 4.0+, which is well past end-of-life for older versions, so this is not a practical concern.
