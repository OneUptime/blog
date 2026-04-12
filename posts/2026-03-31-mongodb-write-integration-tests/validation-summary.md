# Validation Summary: How to Write Integration Tests with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server and Node.js driver)
- Node.js
- Jest (test framework)
- Docker (for running MongoDB)

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB error codes reference (11000 for duplicate key, 121 for schema validation): https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB collation documentation: https://www.mongodb.com/docs/manual/reference/collation/
- Jest configuration documentation: https://jestjs.io/docs/configuration
- Jest globalSetup/globalTeardown documentation: https://jestjs.io/docs/configuration#globalsetup-string
- MongoDB Docker Hub official image: https://hub.docker.com/_/mongo

## Issues Found
No technical issues found.

## Review Notes
- The global setup creates a `MongoClient` stored on `global.__MONGO_CLIENT__` for teardown, while test files create their own separate connections. This is correct since Jest's `globalSetup`/`globalTeardown` share a `global` scope separate from test files.
- The post uses `countDocuments()` which is the current recommended method, not the deprecated `count()`.
- In MongoDB Node.js driver 6.x+, `client.connect()` is optional (auto-connect on first operation), but calling it explicitly as shown is still valid and considered good practice for clarity.
- The `mongo:7` Docker image tag is valid. Authors may want to update to a more specific tag (e.g., `mongo:7.0`) for reproducibility in production setups.
