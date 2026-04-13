# Validation Summary: How to Handle Duplicate Key Errors Gracefully in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (error code 11000, unique indexes, upserts, bulk writes)
- Node.js with MongoDB Node.js driver (v5+/v6)
- Python with PyMongo
- MongoDB Shell (createIndex)

## Sources Consulted
- MongoDB documentation on unique indexes: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB documentation on write errors and error codes: https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB Node.js driver API documentation for `insertOne`, `findOneAndUpdate`, `insertMany`, and `MongoBulkWriteError`: https://www.mongodb.com/docs/drivers/node/current/
- PyMongo documentation for `DuplicateKeyError` and error handling: https://pymongo.readthedocs.io/en/stable/api/pymongo/errors.html
- MongoDB documentation on `findOneAndUpdate` with upsert: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB documentation on ordered vs unordered bulk writes: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/

## Issues Found
- **Unused `MongoError` import**: The first Node.js code example imported `MongoError` from the `mongodb` package (`const { MongoClient, MongoError } = require("mongodb")`) but never used it anywhere in the code block. Removed the unused import, changing it to `const { MongoClient } = require("mongodb")`. This avoids reader confusion and is cleaner since the error handling relies on checking `err.code === 11000` rather than `instanceof MongoError`.

## Review Notes
- The `err.keyValue` property on the Node.js driver error object is populated from the server error response and requires MongoDB server 4.0+. This is not called out in the post but is unlikely to be an issue since MongoDB 4.x reached end-of-life.
- The `findOneAndUpdate` return value (`result` being the document directly, not `result.value`) is correct for the Node.js driver v5+/v6. Users on driver v4 would need to access `result.value` instead.
- The bulk write error handling checks `err.code === 11000 || err.name === "MongoBulkWriteError"`. The `||` makes this work correctly, though `MongoBulkWriteError` itself may not carry code 11000 at the top level — the individual `writeErrors` entries do. The code functions correctly as written.
- The PyMongo `DuplicateKeyError.details` attribute containing `keyValue` requires MongoDB server 4.0+.
