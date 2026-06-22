# Validation Summary: How to Fix 'Test Data' Management Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Vitest
- node-postgres / pg
- PostgreSQL transactions, TRUNCATE, sequences, and identifiers
- Faker.js
- Test factories, fixtures, seeders, builders, and cleanup patterns
- Mermaid diagrams

## Sources Consulted
- node-postgres Transactions: https://node-postgres.com/features/transactions
- node-postgres Queries / parameterized queries: https://node-postgres.com/features/queries
- PostgreSQL Lexical Structure / identifiers: https://www.postgresql.org/docs/current/sql-syntax-lexical.html
- PostgreSQL TRUNCATE: https://www.postgresql.org/docs/current/sql-truncate.html
- Vitest Hooks API: https://vitest.dev/api/hooks.html
- Vitest Test API: https://vitest.dev/api/test
- Faker.js Usage Guide: https://fakerjs.dev/guide/usage
- Faker.js Person API: https://fakerjs.dev/api/person
- Faker.js Internet API: https://fakerjs.dev/api/internet

## Issues Found
- The transaction helper stored a single module-level `PoolClient`, which is unsafe for concurrent tests and obscures the requirement that all queries in the transaction use the same client. Updated the helper to return a per-test client, pass that client to rollback, and show the service call using the same client.
- The dynamic fixture loader interpolated table and column names directly into SQL. Parameterized query placeholders do not protect identifiers, so I added identifier validation and quoting before interpolation.
- The fixture examples used camelCase keys for values inserted directly as SQL columns. Updated those keys to `discount_percent` and `completed_at` so they match typical PostgreSQL column naming and the quoted identifier helper.
- The seeding and full cleanup examples used `TRUNCATE ... CASCADE` while the surrounding guidance discussed clean state and sequence resets. Added `RESTART IDENTITY`, which PostgreSQL documents as the option that restarts owned sequences.
- The async `OrderBuilder` usage chained `withItem()` calls even though `withItem()` returns a promise. Rewrote the usage to await each async builder method before calling the next method.
- The builder imported `OrderItem` but did not use it. Removed the unused import from the example.
- The cleanup helpers interpolated table and sequence names directly into SQL. Added the same identifier validation and quoting pattern used by the fixture loader.

## Review Notes
The examples are intentionally framework-agnostic and use placeholder services such as `userService`, `permissionService`, and `shippingService`. In a real codebase, those services must be designed to accept the transaction client or otherwise run inside the same transaction context for rollback isolation to work.
