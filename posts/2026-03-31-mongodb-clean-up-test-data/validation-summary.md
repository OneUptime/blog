# Validation Summary: How to Clean Up Test Data After MongoDB Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (Node.js driver)
- mongodb-memory-server
- Jest (test lifecycle hooks)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Node.js Driver API documentation: https://mongodb.github.io/node-mongodb-native/
- mongodb-memory-server documentation: https://github.com/nodkz/mongodb-memory-server
- MDN Web Docs for String.prototype.substr() deprecation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr
- MongoDB Manual - Transactions: https://www.mongodb.com/docs/manual/core/transactions/

## Issues Found
- **Deprecated `substr()` usage**: In Strategy 3 (unique database per test), the code used `Math.random().toString(36).substr(2, 6)` which relies on `String.prototype.substr()`, a deprecated method. Changed to `substring(2, 8)` which is the modern equivalent (start index 2, end index 8 yields the same 6 characters).

## Review Notes
- The Summary section advises "Always clean up after tests, not before" but Strategy 1 demonstrates `beforeEach` cleanup (before tests). Both approaches are valid and have trade-offs — cleaning before ensures a known starting state regardless of prior failures, while cleaning after preserves data for debugging failed tests. This is a stylistic preference, not a technical error.
- All MongoDB driver API calls (`deleteMany`, `drop`, `dropDatabase`, `createIndex`, `startSession`, `startTransaction`, `abortTransaction`, `countDocuments`, `collections()`) are correct and current.
- The transaction rollback strategy correctly notes the replica set requirement.
- The mongodb-memory-server API usage (`MongoMemoryServer.create()`, `mongod.getUri()`, `mongod.stop()`) is correct.
