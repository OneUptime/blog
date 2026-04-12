# Validation Summary: How to Create Test Fixtures and Seed Data for MongoDB Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver)
- Jest (test framework)
- mongodb-memory-server (in-memory MongoDB for testing)
- Node.js (CommonJS modules)

## Sources Consulted
- MDN Web Docs: String.prototype.substr() deprecation notice — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr
- MDN Web Docs: String.prototype.substring() — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
- MongoDB Node.js Driver API: Collection.insertMany(), Collection.find(), Collection.deleteMany() — https://www.mongodb.com/docs/drivers/node/current/
- mongodb-memory-server API: MongoMemoryServer.create() — https://github.com/nodkz/mongodb-memory-server
- Jest API: expect, toHaveLength, arrayContaining — https://jestjs.io/docs/expect

## Issues Found
1. **Deprecated `substr()` method**: In the `buildProduct` fixture factory, `.substr(2, 6)` was used on a string. `String.prototype.substr()` is deprecated (ECMAScript Annex B) and should not be used in new code. Replaced with `.substring(2, 8)` which produces the same result (6 characters starting at index 2).

## Review Notes
- The `loadFixture` helper uses `require()` to load JSON files. Since `require()` caches modules, calling `loadFixture` with the same fixture name multiple times will return the same object references. After the first `insertMany` call, the MongoDB driver adds `_id` fields to the documents in-place. Subsequent calls would attempt to insert documents with duplicate `_id` values, causing errors. In practice, this is mitigated by the `beforeEach` cleanup pattern shown in the post, but readers building on this pattern should be aware of the caching behavior.
- All MongoDB driver APIs used (`insertMany`, `find`, `deleteMany`, `MongoClient`, `ObjectId`) are current and non-deprecated.
- The `MongoMemoryServer.create()` API and `mongod.getUri()` usage are correct for current versions of mongodb-memory-server.
- The Jest lifecycle hooks (`beforeAll`, `afterAll`, `beforeEach`) and assertion methods are all correctly used.
