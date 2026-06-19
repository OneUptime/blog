# Validation Summary: How to Fix 'Parallel Test' Execution Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- JavaScript
- Node.js
- Jest
- Pytest
- pytest-xdist
- Playwright Test
- PostgreSQL
- node-postgres
- CI/CD test execution

## Sources Consulted
- Jest configuration documentation: https://jestjs.io/docs/configuration
- Jest CLI options documentation: https://jestjs.io/docs/cli
- pytest-xdist worker identification documentation: https://pytest-xdist.readthedocs.io/en/stable/how-to.html
- pytest-xdist distribution documentation: https://pytest-xdist.readthedocs.io/en/stable/distribution.html
- Pytest fixture documentation: https://docs.pytest.org/en/stable/how-to/fixtures.html
- Playwright parallelism documentation: https://playwright.dev/docs/test-parallel
- Playwright configuration documentation: https://playwright.dev/docs/test-configuration
- Playwright TestConfig API documentation: https://playwright.dev/docs/api/class-testconfig
- Node.js net server documentation: https://nodejs.org/api/net.html
- Node.js fs/promises documentation: https://nodejs.org/api/fs.html
- node-postgres documentation: https://node-postgres.com/
- PostgreSQL CREATE DATABASE documentation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- PostgreSQL DROP DATABASE documentation: https://www.postgresql.org/docs/current/sql-dropdatabase.html

## Issues Found
- The Jest per-worker database setup showed `setupFile.js` but did not register it in `jest.config.js`. Added `setupFiles: ['./test/setup/setupFile.js']`.
- The database setup file used `beforeAll` to set `process.env.DATABASE_NAME`, which is too late for code imported before hooks run. Changed it to top-level setup code in a Jest `setupFiles` module.
- The file-system section described "Jest's Built-in Temp Directories" and implied `cacheDirectory` was an isolated test temp directory. Renamed the section and clarified that `cacheDirectory` is for Jest's internal cache.
- The network-port helper checked for an available port, closed it, and then reused the number later, which can race with another process. Changed the helper to bind the app directly to port `0` and read the assigned port from the live server.
- The server teardown example called `server.close()` without waiting for completion. Updated it to return a promise from `afterAll`.
- The Pytest example redefined `worker_id` instead of using pytest-xdist's built-in fixture. Removed the custom fixture and unused import.
- The pytest-xdist configuration comments said file-based distribution was the default. Corrected the comments to state that the default is `--dist=load`, and file grouping requires `--dist=loadfile`.
- The test annotation section used `describe.serial`, which is not a Jest API. Replaced it with Playwright's serial configuration pattern and a Jest `--runInBand` command for sequential files.
- The package script used the obsolete Jest singular flag `--testPathPattern`. Updated it to `--testPathPatterns`.

## Review Notes
- Most examples are intentionally illustrative and depend on project-local helpers such as `runMigrations`, `create_database`, `create_session`, and `configManager`.
- The PostgreSQL database creation example uses controlled generated database names, so direct identifier interpolation is acceptable in context. Dynamic identifiers from untrusted input would need proper identifier escaping.
- Transaction rollback examples are correct for code that uses the same database client or session. Application code that obtains separate connections will not automatically participate in the test transaction without additional dependency injection.
