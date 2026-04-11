# Validation Summary: How to Use Testcontainers for MySQL in CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Testcontainers (Java 1.19.7, Node.js)
- MySQL 8.0.35
- Docker
- JUnit 5 (Jupiter)
- Node.js with mysql2 driver
- GitHub Actions CI/CD
- Apache Maven

## Sources Consulted
- Testcontainers Java official documentation — https://java.testcontainers.org/modules/databases/mysql/
- Testcontainers Node.js MySQL module documentation — https://node.testcontainers.org/modules/mysql/
- Testcontainers reuse feature documentation — https://java.testcontainers.org/features/reuse/
- Testcontainers JUnit 5 integration documentation — https://java.testcontainers.org/test_framework_integration/junit_5/
- GitHub Actions runner images documentation (pre-installed software)
- npm registry for @testcontainers/mysql package

## Issues Found

1. **Node.js package name incorrect**: The post used `npm install --save-dev testcontainers mysql2` and `require('testcontainers')`. The `MySqlContainer` class is exported from the dedicated `@testcontainers/mysql` package, not the base `testcontainers` package. Fixed the install command to `npm install --save-dev @testcontainers/mysql mysql2` and the import to `require('@testcontainers/mysql')`.

2. **Node.js `getFirstMappedPort()` not idiomatic**: The post used `container.getFirstMappedPort()` which is a generic container method. The `@testcontainers/mysql` module provides a MySQL-specific `getPort()` convenience method that is the documented and idiomatic approach. Changed to `container.getPort()`.

## Review Notes
- The post uses Testcontainers version 1.19.7 for Java. This is a valid release but is outdated — the latest 1.x release is 1.21.4, and Testcontainers 2.x has been released with breaking changes (module renaming, package relocation). The code examples are self-consistent with the 1.x API shown.
- The `withReuse(true)` feature is presented in a CI/CD context, but the official documentation notes that container reuse is an experimental feature intended for local development, not CI environments. CI runs typically benefit from fresh containers for isolation guarantees.
- The `TESTCONTAINERS_RYUK_DISABLED` env var is set to `"false"` in the GitHub Actions config, which is the default behavior. This line is harmless but unnecessary — Ryuk is enabled by default. It could be useful as documentation of the option's existence.
