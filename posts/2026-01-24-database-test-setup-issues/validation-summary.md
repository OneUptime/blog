# Validation Summary: How to Fix 'Database Test' Setup Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- PostgreSQL
- node-postgres (`pg`)
- Jest
- Knex
- Docker Compose
- Testcontainers for Node.js
- Prisma
- TypeORM
- GitHub Actions service containers
- SQLite in-memory databases

## Sources Consulted
- Jest configuration documentation: https://jestjs.io/docs/configuration
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- Knex migrations documentation: https://knexjs.org/guide/migrations.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Testcontainers for Node.js PostgreSQL module documentation: https://node.testcontainers.org/modules/postgresql/
- PostgreSQL `CREATE DATABASE` documentation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/current/app-pg-isready.html
- GitHub Actions PostgreSQL service container documentation: https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers
- Prisma CLI reference: https://www.prisma.io/docs/orm/reference/prisma-cli-reference
- Prisma model and CRUD query documentation: https://www.prisma.io/docs/orm/prisma-schema/data-model/models
- TypeORM DataSource API documentation: https://typeorm.io/docs/data-source/data-source-api/

## Issues Found
- The Jest global setup snippet called `runMigrations()` without importing it. Added the missing `require('./runMigrations')` import so the snippet is executable.
- The database readiness helper only closed the pool on success. Reworked it to use `pool.query('SELECT 1')` and close the pool in a `finally` block, consistent with node-postgres pool cleanup guidance.
- The PostgreSQL truncation helper used `SET session_replication_role = replica`, which can require elevated privileges and is unnecessary with `TRUNCATE ... CASCADE`. Removed those statements.
- The fixture loader interpolated table and column identifiers without quoting. Added a small identifier-quoting helper for fixture table and column names.
- The Knex SQLite example treated any non-empty `USE_SQLITE` environment value, including `"false"`, as enabled. Changed checks to `process.env.USE_SQLITE === 'true'`.
- The Docker Compose example used the obsolete top-level `version` field and the legacy `docker-compose` command form. Updated the snippet for current Docker Compose V2 usage.
- The npm test script did not stop the test database if Jest failed. Updated the script to preserve Jest's exit code while still running database teardown.
- The Testcontainers/Jest teardown example stored the container only in module scope. Updated it to store the container on `globalThis`, matching Jest's documented global setup/global teardown sharing model.
- The Jest parallel database example incorrectly used `JEST_WORKER_ID` inside `globalSetup`, which runs once before all suites rather than once per worker. Updated it to create all worker databases in global setup and select the per-worker database in `setupFiles`.
- PostgreSQL database creation snippets interpolated database names directly as SQL identifiers. Added validation and identifier quoting before `DROP DATABASE` and `CREATE DATABASE`.
- The Prisma example used `npx prisma db push --skip-generate`, but Prisma v7 removed `--skip-generate` because `db push` no longer runs generation automatically. Removed the flag.
- The Prisma cleanup example used `table.toLowerCase()`, which breaks multi-word model delegates such as `OrderItem` by producing `orderitem` instead of `orderItem`. Replaced it with explicit Prisma Client delegate names.

## Review Notes
The examples are intentionally generic and still need adaptation for each application's schema, migration tooling, and test runner lifecycle. The guide now notes that worker databases must receive migrations before tests use them or be created from an already migrated template database.
