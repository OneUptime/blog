# Validation Summary: How to Use mongodb-memory-server for In-Memory Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- mongodb-memory-server (npm package)
- MongoDB Node.js driver (`mongodb`)
- Jest (test framework)
- Node.js

## Sources Consulted
- mongodb-memory-server official documentation: https://github.com/nodkz/mongodb-memory-server
- MongoDB Node.js driver API documentation: https://www.mongodb.com/docs/drivers/node/current/
- Jest documentation (global setup/teardown): https://jestjs.io/docs/configuration#globalsetup-string
- MongoDB error codes reference (duplicate key error 11000): https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found
1. **Database name mismatch between `clearDatabase` and tests (bug):** The `clearDatabase` helper used `client.db()` which returns the default database, but the test file used `client.db('testdb')`, a different database. This meant `clearDatabase()` in `beforeEach` would never actually clear the test data, breaking test isolation. Fixed by changing `client.db('testdb')` to `client.db()` so both the tests and the cleanup helper operate on the same default database.
2. **Unused import in test file:** The test file imported `const { MongoClient } = require('mongodb')` but never used it (the client is obtained from the `connect()` helper). Removed the unused import.

## Review Notes
- The `globalTeardown.js` file is referenced in the Jest config but its implementation is not shown. Readers will need to create a teardown that calls `global.__MONGOD__.stop()`. This is a minor completeness gap, not a technical error.
- The description of mongodb-memory-server as running MongoDB "in memory" is a common simplification. It actually starts a real `mongod` process with a temporary data directory on disk, not purely in-memory storage. This is consistent with the library's own naming and documentation.
- All MongoDB driver APIs used (`MongoClient`, `createIndex`, `insertOne`, `findOne`, `insertMany`, `aggregate`, `deleteMany`) are current and non-deprecated as of MongoDB Node.js driver v6.x.
- The duplicate key error code 11000 and the `rejects.toMatchObject({ code: 11000 })` Jest pattern are correct.
- The aggregation pipeline test results are mathematically correct (tools avg = (20+30)/2 = 25, toys avg = 15/1 = 15).
