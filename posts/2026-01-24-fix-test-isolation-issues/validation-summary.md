# Validation Summary: How to Fix 'Test Isolation' Issues

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- JavaScript
- Node.js CommonJS modules
- Node.js environment variables
- Jest
- PostgreSQL transaction testing patterns
- node-postgres style transaction handling
- Mermaid diagrams

## Sources Consulted
- Jest configuration documentation: https://jestjs.io/docs/configuration
- Jest CLI options documentation: https://jestjs.io/docs/cli
- Jest object and fake timers documentation: https://jestjs.io/docs/jest-object
- Node.js CommonJS module caching documentation: https://nodejs.org/api/modules.html#caching
- Node.js process.env documentation: https://nodejs.org/api/process.html#processenv
- node-postgres transactions documentation: https://node-postgres.com/features/transactions
- Local Jest CLI help via `npx jest --help`

## Issues Found
- The database state leakage example queried `nonexistent@example.com` while claiming it would fail because `test@example.com` persisted from a previous test. Changed the query to `test@example.com` so the example demonstrates the stated leakage.
- The unique email database example claimed it would fail due to prior persisted state, but the expectation would pass if the previous test had already inserted the duplicate email. Added an explicit first create inside the test so the uniqueness assertion is self-contained.
- The singleton reset solution used `cache.clear()` without requiring the cache module in the test snippet. Added the missing `require('../src/cache')`.
- The Jest randomization configuration showed `seed` inside `jest.config.js`. Current Jest documents `randomize` and `showSeed` as configuration options, while `seed` is a CLI option. Replaced the config example with `showSeed: true` and added a CLI example using `jest --randomize --seed=12345`.
- The command comment said `jest --runInBand --detectOpenHandles` runs each test file in a separate process. Jest documents `--runInBand` as running tests serially in the current process, and `--detectOpenHandles` implies `--runInBand`. Updated the comment accordingly.

## Review Notes
The transaction rollback example is accurate for database clients that can bind repository work to a single transaction client; node-postgres specifically requires all statements in a transaction to use the same client instance. The fake timer examples use current Jest APIs, including `jest.useFakeTimers()`, `jest.setSystemTime()`, `jest.advanceTimersByTime()`, and `jest.useRealTimers()`.
