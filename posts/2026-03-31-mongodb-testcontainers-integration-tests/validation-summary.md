# Validation Summary: How to Use Testcontainers for MongoDB Integration Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Testcontainers (Node.js, Java, Python)
- MongoDB 7
- Docker
- Jest (Node.js test runner)
- JUnit 5 (Java test framework)
- pytest (Python test framework)
- mongodb Node.js driver
- pymongo Python driver
- @testcontainers/mongodb (Node.js module)
- testcontainers-java MongoDB module
- testcontainers-python MongoDB module

## Sources Consulted
- npm registry for `@testcontainers/mongodb` package (v11.14.0) — verified exported class `MongoDBContainer`, constructor signature, and `getConnectionString()` method
- npm registry for `testcontainers` core package — confirmed it does not export `MongoDBContainer`
- Testcontainers Java MongoDB module documentation (org.testcontainers.containers.MongoDBContainer)
- Testcontainers Python module (`testcontainers.mongodb.MongoDbContainer`)
- MongoDB documentation for error codes (11000 = DuplicateKey, 121 = DocumentValidationFailure)
- MongoDB `$jsonSchema` validation documentation (`minimum` keyword for numeric types)

## Issues Found
1. **Incorrect npm install command** (Line 18): The install command was `npm install --save-dev testcontainers mongodb jest`, but the code imports `MongoDBContainer` from `@testcontainers/mongodb`, not from the core `testcontainers` package. Fixed to `npm install --save-dev @testcontainers/mongodb mongodb jest`. The `@testcontainers/mongodb` package includes `testcontainers` as a dependency, so only the scoped package needs to be installed explicitly.

## Review Notes
- The Java example uses `getConnectionString()` which is available in recent testcontainers-java versions (1.19+) as an alias for the older `getReplicaSetUrl()`. Both work with current versions.
- The Java test uses `assert` statements instead of JUnit `Assertions` methods. While functional (test runners typically enable assertions), using `Assertions.assertEquals()` / `Assertions.assertNotNull()` would be more idiomatic JUnit 5 and provide better failure messages.
- The Node.js `getConnectionString()` may return a URL with `?directConnection=true` appended, which is fine for single-node test usage but worth noting for readers who may need replica set behavior.
