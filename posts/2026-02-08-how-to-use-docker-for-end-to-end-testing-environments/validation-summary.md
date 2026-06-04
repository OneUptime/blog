# Validation Summary: How to Use Docker for End-to-End Testing Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Docker health checks and service dependencies
- PostgreSQL
- Redis
- RabbitMQ
- Playwright
- GitHub Actions
- Prisma migrations

## Sources Consulted
- Docker Compose overview: https://docs.docker.com/compose/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose service reference (`depends_on`, `healthcheck`, `tmpfs`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI help from local Docker Compose v5.1.3 for `up`, `down`, and relevant flags.
- Playwright Docker documentation: https://playwright.dev/docs/docker
- Playwright configuration documentation: https://playwright.dev/docs/test-configuration
- Playwright videos documentation: https://playwright.dev/docs/videos
- Playwright trace viewer documentation: https://playwright.dev/docs/trace-viewer
- Playwright CLI documentation: https://playwright.dev/docs/test-cli
- PostgreSQL 16 `pg_isready` documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- PostgreSQL `DROP DATABASE` documentation: https://www.postgresql.org/docs/current/sql-dropdatabase.html
- PostgreSQL WAL/runtime configuration documentation: https://www.postgresql.org/docs/current/runtime-config-wal.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- `actions/upload-artifact` documentation: https://github.com/actions/upload-artifact

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Modern Compose validates against the current Compose Specification regardless of that field and warns that it is obsolete, so the line was removed.
- The Playwright Docker image tag was pinned to the old `v1.42.0-jammy` image. The example was updated to the current official `v1.60.0-noble` image tag.
- Playwright artifacts were mounted and uploaded from `e2e/results`, but the Playwright config did not set `outputDir`, so screenshots, videos, and traces would be written to the default `test-results` directory inside the container. Added `outputDir: 'results/test-results'` and removed the unused separate screenshots artifact path.
- The trace viewer command pointed to `e2e/results/trace.zip`, but Playwright writes traces under the test output directory for the failed test. Updated the command to locate a generated `trace.zip` under `e2e/results/test-results`.
- The database reset script used `DROP DATABASE IF EXISTS testdb;`, which can fail if application services still hold connections to `testdb`. Updated it to `DROP DATABASE IF EXISTS testdb WITH (FORCE);`, which is supported by current PostgreSQL and appropriate for the PostgreSQL 16 image used in the examples.

## Review Notes
- The health check examples are technically valid, but the custom `api` and `frontend` images must include `curl` for those health checks to work.
- The Playwright Docker image includes browser binaries and system dependencies, but the Playwright npm package should still be installed by `npm ci`; the sample Dockerfile follows that pattern.
- The PostgreSQL durability settings shown are appropriate only for disposable test databases, as the post states.
