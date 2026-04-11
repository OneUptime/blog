# Validation Summary: How to Use MySQL Testcontainers in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Testcontainers for Node.js (`@testcontainers/mysql`)
- Node.js
- mysql2 (Node.js MySQL driver)
- Mocha (test runner)
- Jest (test runner)
- Docker

## Sources Consulted
- Testcontainers Node.js MySQL module source code: https://github.com/testcontainers/testcontainers-node/tree/main/packages/modules/mysql
- Testcontainers Node.js documentation: https://node.testcontainers.org/modules/mysql/
- npm package `@testcontainers/mysql`: https://www.npmjs.com/package/@testcontainers/mysql
- Jest configuration documentation: https://jestjs.io/docs/configuration
- mysql2 Node.js driver documentation: https://sidorares.github.io/node-mysql2/docs

## Issues Found

### 1. Wrong package name and import path
- **What was wrong:** The post imported `MySqlContainer` from `'testcontainers'` and installed the `testcontainers` package. However, `MySqlContainer` lives in the separate `@testcontainers/mysql` module package, not in the base `testcontainers` package.
- **What was changed:** Updated the install command from `npm install --save-dev testcontainers mysql2` to `npm install --save-dev @testcontainers/mysql mysql2`. Updated all `require('testcontainers')` imports to `require('@testcontainers/mysql')` (affected both the Mocha and Jest code examples).
- **Why:** Using the base `testcontainers` package would result in a runtime error since `MySqlContainer` is not exported from it. The `@testcontainers/mysql` package includes `testcontainers` as a dependency, so it pulls in the core library automatically.

### 2. Jest `globalSetup` misuse with `beforeAll`/`afterAll`
- **What was wrong:** The Jest setup file (`jest.setup.js`) used `beforeAll` and `afterAll` hooks, but `jest.config.js` referenced it via `globalSetup`. Jest's `globalSetup` expects a module that exports a single async function — `beforeAll`, `afterAll`, and other Jest globals are not available in that context. This code would fail at runtime.
- **What was changed:** Changed `jest.config.js` from `globalSetup: './jest.setup.js'` to `setupFilesAfterFramework: ['./jest.setup.js']`. The `setupFilesAfterFramework` config option runs the specified files after the Jest test framework is installed, making `beforeAll`/`afterAll` globals available.
- **Why:** `globalSetup` runs in a separate Node.js context without Jest globals. `setupFilesAfterFramework` runs in the test context where `beforeAll`/`afterAll` are defined.

## Review Notes
- All MySQL API methods on `MySqlContainer` and `StartedMySqlContainer` (`getHost()`, `getPort()`, `getDatabase()`, `getUsername()`, `getUserPassword()`) are verified correct against the source code.
- The `mysql2/promise` usage (connection creation, `execute` with parameterized queries, result destructuring) is correct and follows current best practices.
- The SQL schema, `TRUNCATE` approach for test isolation, and `connection.end()` / `container.stop()` cleanup pattern are all sound.
- The schema file loading approach (split on semicolons) is a simple but common pattern. It will not handle semicolons inside string literals or stored procedures correctly, but this is acceptable for a basic tutorial.
